import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTTL } from '../cache/cache-keys';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async getResumePoint(userId: string) {
    return this.cache.getOrSet(
      CacheKeys.resumePoint(userId),
      CacheTTL.RESUME_POINT,
      async () => {
        const progress = await this.prisma.userProgress.findUnique({
          where: { userId },
          select: {
            currentModuleId: true,
            currentMilestoneId: true,
            learningPathId: true,
            lastActivityAt: true,
            overallCompletionPct: true,
            streakDays: true,
          },
        });
        return progress;
      },
    );
  }

  // ── MAIN ENTRY POINT ───────────────────────────────────

  /**
   * markResourceComplete: marks a resource as fully consumed.
   * Triggers: module completion check → exercise unlock → milestone unlock.
   * This is the authoritative completion endpoint — use this, not markResourceViewed.
   */
  async markResourceComplete(
    userId: string,
    resourceId: string,
    timeSpentSeconds: number = 0,
  ) {
    // 1. Fetch resource + module context
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        module: {
          include: {
            milestone: {
              include: {
                learningPath: {
                  select: { id: true, totalMilestones: true },
                },
              },
            },
          },
        },
      },
    });
    if (!resource) throw new NotFoundException('Resource not found');

    const module = resource.module;
    const milestone = module.milestone;
    const pathId = milestone.learningPath.id;

    // 2. Idempotent upsert of ResourceCompletion
    await this.prisma.resourceCompletion.upsert({
      where: { userId_resourceId: { userId, resourceId } },
      create: {
        userId,
        resourceId,
        moduleId: module.id,
        timeSpentSeconds,
      },
      update: {
        timeSpentSeconds: { increment: timeSpentSeconds },
      },
    });

    // 3. Update UserProgress time + lastActivityAt
    await this.prisma.userProgress.upsert({
      where: { userId },
      create: {
        userId,
        learningPathId: pathId,
        timeSpentMinutes: Math.ceil(timeSpentSeconds / 60),
        lastActivityAt: new Date(),
        status: 'IN_PROGRESS',
        currentMilestoneId: milestone.id,
        currentModuleId: module.id,
      },
      update: {
        timeSpentMinutes: { increment: Math.ceil(timeSpentSeconds / 60) },
        lastActivityAt: new Date(),
        status: 'IN_PROGRESS',
      },
    });

    // 4. Update streak
    await this.updateStreak(userId);

    // 5. Check if module is now complete
    const moduleResult = await this.checkModuleCompletion(
      userId,
      module.id,
      milestone.id,
    );

    // 6. Recompute overall completion %
    await this.recomputeOverallProgress(userId, pathId);

    // 7. Invalidate caches
    await this.cache.del(CacheKeys.resumePoint(userId));
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (user) {
      await this.cache.delPattern(`team:${user.organizationId}:overview:*`);
    }

    return {
      resourceId,
      moduleId: module.id,
      milestoneId: milestone.id,
      pathId,
      isModuleComplete: moduleResult.isComplete,
      completedCount: moduleResult.completedCount,
      totalCount: moduleResult.totalCount,
      unlockedModuleId: moduleResult.unlockedModuleId ?? null,
      unlockedExercises: moduleResult.unlockedExercises ?? [],
    };
  }

  // ── MODULE COMPLETION CHECK ────────────────────────────

  async checkModuleCompletion(
    userId: string,
    moduleId: string,
    milestoneId: string,
  ) {
    // Count total vs completed resources in this module
    const [totalResources, completedResources] = await Promise.all([
      this.prisma.resource.count({ where: { moduleId } }),
      this.prisma.resourceCompletion.count({
        where: { userId, moduleId },
      }),
    ]);

    const isComplete =
      totalResources > 0 && completedResources >= totalResources;

    let unlockedModuleId: string | null = null;
    let unlockedExercises: string[] = [];

    if (isComplete) {
      this.logger.log(`Module ${moduleId} complete for user ${userId}`);

      // Unlock exercises for this milestone
      unlockedExercises = await this.unlockMilestoneExercises(milestoneId);

      // Check if ALL modules in milestone are done
      const milestoneResult = await this.checkMilestoneProgress(
        userId,
        milestoneId,
      );

      if (!milestoneResult.isComplete) {
        // Unlock the next module in the same milestone
        unlockedModuleId = await this.unlockNextModule(moduleId, milestoneId);
      }
    }

    return {
      isComplete,
      completedCount: completedResources,
      totalCount: totalResources,
      unlockedModuleId,
      unlockedExercises,
    };
  }

  // ── UNLOCK NEXT MODULE ────────────────────────────────

  private async unlockNextModule(
    currentModuleId: string,
    milestoneId: string,
  ): Promise<string | null> {
    // Find the current module's sequence order
    const currentModule = await this.prisma.module.findUnique({
      where: { id: currentModuleId },
      select: { sequenceOrder: true },
    });
    if (!currentModule) return null;

    // Find the next module in the same milestone
    const nextModule = await this.prisma.module.findFirst({
      where: {
        milestoneId,
        sequenceOrder: { gt: currentModule.sequenceOrder },
        isLocked: true,
      },
      orderBy: { sequenceOrder: 'asc' },
    });

    if (!nextModule) return null;

    // Unlock it
    await this.prisma.module.update({
      where: { id: nextModule.id },
      data: { isLocked: false },
    });

    this.logger.log(`Unlocked module: ${nextModule.id} (${nextModule.title})`);
    return nextModule.id;
  }

  // ── UNLOCK EXERCISES ──────────────────────────────────

  private async unlockMilestoneExercises(
    milestoneId: string,
  ): Promise<string[]> {
    // Find all locked exercises for this milestone
    const lockedExercises = await this.prisma.exercise.findMany({
      where: { milestoneId, isLocked: true },
      select: { id: true },
    });

    if (!lockedExercises.length) return [];

    // Unlock them all
    await this.prisma.exercise.updateMany({
      where: { milestoneId, isLocked: true },
      data: { isLocked: false },
    });

    const ids = lockedExercises.map((e) => e.id);
    this.logger.log(
      `Unlocked ${ids.length} exercise(s) for milestone ${milestoneId}`,
    );
    return ids;
  }

  // ── MILESTONE PROGRESS CHECK ──────────────────────────

  async checkMilestoneProgress(userId: string, milestoneId: string) {
    // Get all modules in the milestone
    const modules = await this.prisma.module.findMany({
      where: { milestoneId },
      select: { id: true },
    });

    // Check completion for each module
    const completionChecks = await Promise.all(
      modules.map(async (mod) => {
        const total = await this.prisma.resource.count({
          where: { moduleId: mod.id },
        });
        const done = await this.prisma.resourceCompletion.count({
          where: { userId, moduleId: mod.id },
        });
        return total > 0 && done >= total;
      }),
    );

    const allModulesDone = completionChecks.every(Boolean);

    // Check exercises passed
    const exercises = await this.prisma.exercise.findMany({
      where: { milestoneId },
      select: { id: true },
    });

    let allExercisesPassed = true;
    if (exercises.length > 0) {
      const passedCount = await this.prisma.exerciseSubmission.count({
        where: {
          userId,
          exerciseId: { in: exercises.map((e) => e.id) },
          status: 'PASSED',
        },
      });
      allExercisesPassed = passedCount >= exercises.length;
    }

    const isComplete = allModulesDone && allExercisesPassed;

    if (isComplete) {
      await this.completeMilestone(userId, milestoneId);
    }

    return {
      isComplete,
      allModulesDone,
      allExercisesPassed,
      completedModules: completionChecks.filter(Boolean).length,
      totalModules: modules.length,
    };
  }

  // ── COMPLETE MILESTONE + UNLOCK NEXT ──────────────────

  private async completeMilestone(userId: string, milestoneId: string) {
    // Mark milestone as completed
    await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: { completedAt: new Date() },
    });

    // Find the next milestone in the same path
    const currentMilestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      select: {
        sequenceOrder: true,
        learningPathId: true,
        title: true,
      },
    });
    if (!currentMilestone) return;

    const nextMilestone = await this.prisma.milestone.findFirst({
      where: {
        learningPathId: currentMilestone.learningPathId,
        sequenceOrder: { gt: currentMilestone.sequenceOrder },
        isLocked: true,
      },
      orderBy: { sequenceOrder: 'asc' },
      include: {
        modules: {
          orderBy: { sequenceOrder: 'asc' },
          take: 1,
        },
      },
    });

    if (nextMilestone) {
      // Unlock the next milestone
      await this.prisma.milestone.update({
        where: { id: nextMilestone.id },
        data: { isLocked: false },
      });

      // Unlock the first module of the next milestone
      if (nextMilestone.modules[0]) {
        await this.prisma.module.update({
          where: { id: nextMilestone.modules[0].id },
          data: { isLocked: false },
        });
      }

      this.logger.log(
        `Unlocked milestone: ${nextMilestone.id} for user ${userId}`,
      );

      // Update UserProgress to point to new milestone
      await this.prisma.userProgress.updateMany({
        where: { userId },
        data: {
          currentMilestoneId: nextMilestone.id,
          currentModuleId: nextMilestone.modules[0]?.id ?? null,
        },
      });
    } else {
      // No next milestone — path is complete!
      await this.completeEntirePath(userId, currentMilestone.learningPathId);
    }

    this.logger.log(
      `Milestone "${currentMilestone.title}" completed by user ${userId}`,
    );
  }

  // ── PATH COMPLETION ───────────────────────────────────

  private async completeEntirePath(userId: string, pathId: string) {
    await Promise.all([
      this.prisma.learningPath.update({
        where: { id: pathId },
        data: { status: 'COMPLETED' },
      }),
      this.prisma.userProgress.updateMany({
        where: { userId },
        data: {
          status: 'COMPLETED',
          overallCompletionPct: 100,
        },
      }),
    ]);
    this.logger.log(`🎓 Path ${pathId} COMPLETED by user ${userId}`);
  }

  // ── OVERALL PROGRESS RECOMPUTATION ────────────────────

  private async recomputeOverallProgress(userId: string, pathId: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id: pathId },
      include: {
        milestones: {
          include: {
            modules: {
              include: {
                resources: { select: { id: true } },
              },
            },
          },
        },
      },
    });
    if (!path) return;

    // Count total resources across ALL milestones
    const totalResources = path.milestones.reduce(
      (sum, m) =>
        sum + m.modules.reduce((s, mod) => s + mod.resources.length, 0),
      0,
    );
    if (totalResources === 0) return;

    // Count completed resources for this user
    const completedResources = await this.prisma.resourceCompletion.count({
      where: {
        userId,
        moduleId: {
          in: path.milestones.flatMap((m) => m.modules.map((mod) => mod.id)),
        },
      },
    });

    const pct = Math.round((completedResources / totalResources) * 100);

    await this.prisma.userProgress.updateMany({
      where: { userId },
      data: { overallCompletionPct: pct },
    });
  }

  // ── STREAK TRACKING ───────────────────────────────────

  private async updateStreak(userId: string) {
    const progress = await this.prisma.userProgress.findUnique({
      where: { userId },
      select: { lastActivityAt: true, streakDays: true },
    });
    if (!progress) return;

    const now = new Date();
    const lastActive = progress.lastActivityAt;
    if (!lastActive) {
      await this.prisma.userProgress.updateMany({
        where: { userId },
        data: { streakDays: 1 },
      });
      return;
    }

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Already active today → no change
    if (lastActive >= todayStart) return;

    // Active yesterday → increment streak
    if (lastActive >= yesterdayStart) {
      await this.prisma.userProgress.updateMany({
        where: { userId },
        data: { streakDays: { increment: 1 } },
      });
      return;
    }

    // More than 1 day gap → reset streak
    await this.prisma.userProgress.updateMany({
      where: { userId },
      data: { streakDays: 1 },
    });
    this.logger.log(`Streak reset for user ${userId}`);
  }

  // ── GET MODULE PROGRESS ───────────────────────────────

  async getModuleProgress(userId: string, moduleId: string) {
    const [total, completed] = await Promise.all([
      this.prisma.resource.count({ where: { moduleId } }),
      this.prisma.resourceCompletion.count({
        where: { userId, moduleId },
      }),
    ]);

    const completedResources = await this.prisma.resourceCompletion.findMany({
      where: { userId, moduleId },
      select: { resourceId: true },
    });

    return {
      moduleId,
      totalResources: total,
      completedResources: completed,
      completionPct: total > 0 ? Math.round((completed / total) * 100) : 0,
      completedResourceIds: completedResources.map((r) => r.resourceId),
      isComplete: completed >= total && total > 0,
    };
  }

  // ── GET USER PROGRESS SUMMARY ─────────────────────────

  async getUserProgressSummary(userId: string) {
    const progress = await this.prisma.userProgress.findUnique({
      where: { userId },
      include: {
        learningPath: {
          include: {
            milestones: {
              include: {
                modules: {
                  select: { id: true, title: true, isLocked: true },
                },
              },
            },
          },
        },
      },
    });

    if (!progress) return null;

    return {
      userId,
      overallCompletionPct: progress.overallCompletionPct,
      currentMilestoneId: progress.currentMilestoneId,
      currentModuleId: progress.currentModuleId,
      timeSpentMinutes: progress.timeSpentMinutes,
      streakDays: progress.streakDays,
      status: progress.status,
      lastActivityAt: progress.lastActivityAt,
      path: progress.learningPath,
    };
  }

  // ── GET DASHBOARD PROGRESS SUMMARY ─────────────────────

  async getProgressSummary(userId: string) {
    const [progress, path, recentActivity] = await Promise.all([
      // UserProgress record
      this.prisma.userProgress.findUnique({
        where: { userId },
        include: {
          learningPath: {
            select: {
              id: true,
              title: true,
              domain: true,
              totalMilestones: true,
              estimatedHours: true,
            },
          },
        },
      }),
      // Active path with milestones + module counts
      this.prisma.learningPath.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: {
          milestones: {
            orderBy: { sequenceOrder: 'asc' },
            include: {
              modules: {
                select: {
                  id: true,
                  title: true,
                  moduleType: true,
                  estimatedMinutes: true,
                  isLocked: true,
                  sequenceOrder: true,
                },
                orderBy: { sequenceOrder: 'asc' },
              },
              _count: { select: { exercises: true } },
            },
          },
        },
      }),
      // Last 5 completed resources (recent activity)
      this.prisma.resourceCompletion.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: 5,
        include: {
          resource: {
            select: { title: true, resourceType: true, moduleId: true },
          },
        },
      }),
    ]);

    // Find current milestone + next module to do
    const currentMilestone = path?.milestones.find(
      (m) =>
        !m.isLocked &&
        path?.milestones
          .filter((x) => x.sequenceOrder < m.sequenceOrder)
          .every((x) => x.completedAt !== null),
    );

    const nextModule = currentMilestone?.modules.find((m) => !m.isLocked);

    return {
      progress: {
        overallCompletionPct: progress?.overallCompletionPct ?? 0,
        timeSpentMinutes: progress?.timeSpentMinutes ?? 0,
        streakDays: progress?.streakDays ?? 0,
        status: progress?.status ?? 'NOT_STARTED',
        lastActivityAt: progress?.lastActivityAt,
      },
      path: path
        ? {
            id: path.id,
            title: path.title,
            domain: path.domain,
            totalMilestones: path.totalMilestones,
            estimatedHours: path.estimatedHours,
            milestones: path.milestones,
          }
        : null,
      currentMilestone: currentMilestone ?? null,
      nextModule: nextModule ?? null,
      recentActivity: recentActivity,
    };
  }

  // ── GET MILESTONE SUMMARY ─────────────────────────────

  async getMilestoneSummary(userId: string, milestoneId: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        modules: {
          include: {
            resources: { select: { id: true } },
          },
        },
        exercises: {
          include: {
            submissions: {
              where: { userId },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { score: true, status: true },
            },
          },
        },
        learningPath: {
          select: {
            id: true,
            title: true,
            totalMilestones: true,
            milestones: {
              orderBy: { sequenceOrder: 'asc' },
              select: {
                id: true,
                title: true,
                sequenceOrder: true,
                isLocked: true,
                completedAt: true,
              },
            },
          },
        },
      },
    });

    if (!milestone) throw new NotFoundException('Milestone not found');

    // Compute total resources completed in this milestone
    const moduleIds = milestone.modules.map((m) => m.id);
    const completedResources = await this.prisma.resourceCompletion.count({
      where: { userId, moduleId: { in: moduleIds } },
    });
    const totalResources = milestone.modules.reduce(
      (sum, m) => sum + m.resources.length,
      0,
    );

    // Exercise scores
    const exerciseResults = milestone.exercises.map((ex) => ({
      title: ex.title,
      type: ex.exerciseType,
      score: ex.submissions[0]?.score ?? null,
      passed: ex.submissions[0]?.status === 'PASSED',
    }));

    const avgExerciseScore =
      exerciseResults.length > 0
        ? exerciseResults.reduce((sum, e) => sum + (e.score ?? 0), 0) /
          exerciseResults.length
        : null;

    // Find next milestone
    const currentIdx = milestone.learningPath.milestones.findIndex(
      (m) => m.id === milestoneId,
    );
    const nextMilestone =
      milestone.learningPath.milestones[currentIdx + 1] ?? null;

    // Time spent on this milestone
    const timeSpent = await this.prisma.resourceCompletion.aggregate({
      where: { userId, moduleId: { in: moduleIds } },
      _sum: { timeSpentSeconds: true },
    });
    const timeSpentMinutes = Math.ceil(
      (timeSpent._sum.timeSpentSeconds ?? 0) / 60,
    );

    return {
      milestone: {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        sequenceOrder: milestone.sequenceOrder,
        completedAt: milestone.completedAt,
        estimatedHours: milestone.estimatedHours,
        learningObjectives: milestone.learningObjectives,
      },
      stats: {
        totalResources,
        completedResources,
        timeSpentMinutes,
        exerciseResults,
        avgExerciseScore,
        moduleCount: milestone.modules.length,
      },
      path: {
        id: milestone.learningPath.id,
        title: milestone.learningPath.title,
        totalMilestones: milestone.learningPath.totalMilestones,
        completedMilestones: milestone.learningPath.milestones.filter(
          (m) => m.completedAt !== null,
        ).length,
      },
      nextMilestone,
      isPathComplete: !nextMilestone,
    };
  }

  // ── PROGRESS RECONCILIATION SERVICE ──────────────────

  /**
   * Reconcile UserProgress to ensure currentMilestone +
   * currentModule always point to the actual next thing
   * the learner should do. Call this on login + on path load.
   */
  async reconcileProgress(userId: string): Promise<void> {
    const progress = await this.prisma.userProgress.findUnique({
      where: { userId },
      include: {
        learningPath: {
          include: {
            milestones: {
              orderBy: { sequenceOrder: 'asc' },
              where: { isLocked: false },
              include: {
                modules: {
                  orderBy: { sequenceOrder: 'asc' },
                  where: { isLocked: false },
                  include: {
                    resources: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!progress?.learningPath) return;

    // Find first incomplete module across all unlocked milestones
    let targetMilestoneId: string | null = null;
    let targetModuleId: string | null = null;

    for (const milestone of progress.learningPath.milestones) {
      for (const module of milestone.modules) {
        if (module.resources.length === 0) continue;

        const completed = await this.prisma.resourceCompletion.count({
          where: { userId, moduleId: module.id },
        });

        if (completed < module.resources.length) {
          // This module is not yet done — this is where they should be
          targetMilestoneId = milestone.id;
          targetModuleId = module.id;
          break;
        }
      }
      if (targetModuleId) break;
    }

    // If all modules complete → path might be done
    if (!targetModuleId) {
      const allMilestonesDone = progress.learningPath.milestones.every(
        (m) => m.completedAt !== null,
      );
      if (allMilestonesDone && progress.status !== 'COMPLETED') {
        await this.prisma.userProgress.update({
          where: { userId },
          data: {
            status: 'COMPLETED',
            overallCompletionPct: 100,
          },
        });
      }
      return;
    }

    // Update if stale
    const needsUpdate =
      progress.currentMilestoneId !== targetMilestoneId ||
      progress.currentModuleId !== targetModuleId;

    if (needsUpdate) {
      await this.prisma.userProgress.update({
        where: { userId },
        data: {
          currentMilestoneId: targetMilestoneId,
          currentModuleId: targetModuleId,
          status: 'IN_PROGRESS',
        },
      });
      this.logger.log(
        `Reconciled progress for ${userId}: module → ${targetModuleId}`,
      );
    }
  }
}
