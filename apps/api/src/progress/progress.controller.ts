import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProgressService } from './progress.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('progress')
export class ProgressController {
  constructor(
    private readonly service: ProgressService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('resume')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getResumeState(@CurrentUser() user: any) {
    // Reconcile first
    await this.service.reconcileProgress(user.id);

    const progress = await this.prisma.userProgress.findUnique({
      where: { userId: user.id },
      include: {
        learningPath: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    // No progress at all
    if (!progress || !progress.learningPath) {
      const assessment = await this.prisma.assessment.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      if (!assessment) {
        return {
          success: true,
          data: {
            currentPage: 'no-path',
            redirectUrl: null,
            message: 'No learning path yet',
            progressSummary: null,
          },
        };
      }

      if (assessment.status !== 'COMPLETED') {
        return {
          success: true,
          data: {
            currentPage: 'assessment',
            redirectUrl: `/onboarding/assessment/${assessment.id}`,
            message: 'Assessment in progress',
            progressSummary: null,
          },
        };
      }

      // Assessment done but no path yet (still generating)
      return {
        success: true,
        data: {
          currentPage: 'path-pending',
          redirectUrl: null,
          message: 'Learning path is being generated',
          progressSummary: null,
        },
      };
    }

    // Path complete
    if (progress.status === 'COMPLETED') {
      return {
        success: true,
        data: {
          currentPage: 'path-complete',
          redirectUrl: `/learn/path/${progress.learningPathId}`,
          message: 'Learning path completed',
          progressSummary: {
            completionPct: 100,
            streakDays: progress.streakDays,
            timeSpentMinutes: progress.timeSpentMinutes,
            lastActivityAt: progress.lastActivityAt,
          },
        },
      };
    }

    // Active path — determine exact page
    let currentPage = 'module';
    let redirectUrl = `/learn/dashboard`;

    if (progress.currentModuleId) {
      redirectUrl = `/learn/module/${progress.currentModuleId}`;
      currentPage = 'module';
    } else if (progress.currentMilestoneId) {
      redirectUrl = `/learn/path/${progress.learningPathId}`;
      currentPage = 'path-overview';
    }

    // Fetch current module title for display
    const currentModule = progress.currentModuleId
      ? await this.prisma.module.findUnique({
          where: { id: progress.currentModuleId },
          select: {
            title: true,
            moduleType: true,
            estimatedMinutes: true,
            milestone: { select: { title: true } },
          },
        })
      : null;

    return {
      success: true,
      data: {
        currentPage,
        redirectUrl,
        pathId: progress.learningPathId,
        pathTitle: progress.learningPath.title,
        milestoneId: progress.currentMilestoneId,
        moduleId: progress.currentModuleId,
        currentModule,
        progressSummary: {
          completionPct: progress.overallCompletionPct,
          streakDays: progress.streakDays,
          timeSpentMinutes: progress.timeSpentMinutes,
          lastActivityAt: progress.lastActivityAt,
          status: progress.status,
        },
      },
    };
  }

  /**
   * Full progress snapshot — used on dashboard load.
   * Reconciles progress then returns current state.
   * This is the single source of truth for "where am I?"
   */
  @Get('snapshot')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getProgressSnapshot(@CurrentUser() user: any) {
    // Reconcile first — ensures currentModule is correct
    await this.service.reconcileProgress(user.id);

    const progress = await this.prisma.userProgress.findUnique({
      where: { userId: user.id },
      include: {
        learningPath: {
          include: {
            milestones: {
              orderBy: { sequenceOrder: 'asc' },
              include: {
                modules: {
                  orderBy: { sequenceOrder: 'asc' },
                  select: {
                    id: true,
                    title: true,
                    moduleType: true,
                    estimatedMinutes: true,
                    isLocked: true,
                    sequenceOrder: true,
                    _count: { select: { resources: true } },
                  },
                },
                _count: { select: { exercises: true } },
              },
            },
          },
        },
      },
    });

    if (!progress) {
      return { success: true, data: null };
    }

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await this.prisma.resourceCompletion.findMany({
      where: {
        userId: user.id,
        completedAt: { gte: sevenDaysAgo },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: {
        resource: {
          select: { title: true, resourceType: true, moduleId: true },
        },
      },
    });

    // Daily activity for streak visualization (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyActivity = await this.prisma.resourceCompletion.groupBy({
      by: ['completedAt'],
      where: {
        userId: user.id,
        completedAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      orderBy: { completedAt: 'asc' },
    });

    // Normalize to date strings for heatmap
    const activityByDate = dailyActivity.reduce(
      (acc, item) => {
        const dateStr = item.completedAt.toISOString().split('T')[0];
        acc[dateStr] = (acc[dateStr] ?? 0) + item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Find current module details
    const currentModule = progress.currentModuleId
      ? await this.prisma.module.findUnique({
          where: { id: progress.currentModuleId },
          select: {
            id: true,
            title: true,
            moduleType: true,
            estimatedMinutes: true,
            milestone: {
              select: { id: true, title: true, sequenceOrder: true },
            },
          },
        })
      : null;

    return {
      success: true,
      data: {
        progress: {
          status: progress.status,
          overallCompletionPct: progress.overallCompletionPct,
          timeSpentMinutes: progress.timeSpentMinutes,
          streakDays: progress.streakDays,
          lastActivityAt: progress.lastActivityAt,
          currentMilestoneId: progress.currentMilestoneId,
          currentModuleId: progress.currentModuleId,
        },
        path: progress.learningPath,
        currentModule,
        recentActivity,
        activityByDate, // ← for streak heatmap
      },
    };
  }

  /**
   * Manager view — progress for all learners in the org.
   * Used by Phase 5 Manager Dashboard.
   */
  @Get('org-overview')
  @Roles(UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getOrgProgressOverview(@CurrentUser() user: any) {
    const learners = await this.prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: UserRole.LEARNER,
      },
      include: {
        department: {
          select: { name: true },
        },
        progress: {
          include: {
            learningPath: {
              select: { title: true, domain: true },
            },
          },
        },
      },
    });

    const overview = learners.map((learner) => {
      const progress = learner.progress;

      // Calculate if stalled (no activity in 7 days)
      const daysSinceActive = progress?.lastActivityAt
        ? Math.floor(
            (Date.now() - progress.lastActivityAt.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

      return {
        userId: learner.id,
        fullName: learner.fullName,
        email: learner.email,
        department: learner.department?.name ?? null,
        jobTitle: learner.jobTitle,
        avatarUrl: learner.avatarUrl,
        pathTitle: progress?.learningPath?.title ?? null,
        pathDomain: progress?.learningPath?.domain ?? null,
        status: progress?.status ?? 'NOT_STARTED',
        overallCompletionPct: progress?.overallCompletionPct ?? 0,
        timeSpentMinutes: progress?.timeSpentMinutes ?? 0,
        streakDays: progress?.streakDays ?? 0,
        lastActivityAt: progress?.lastActivityAt ?? null,
        daysSinceActive,
        isStalled: daysSinceActive !== null && daysSinceActive >= 7,
      };
    });

    const stats = {
      totalLearners: overview.length,
      activeLearners: overview.filter((l) => l.status === 'IN_PROGRESS').length,
      completedLearners: overview.filter((l) => l.status === 'COMPLETED').length,
      stalledLearners: overview.filter((l) => l.isStalled).length,
      avgCompletion:
        overview.length > 0
          ? Math.round(
              overview.reduce((s, l) => s + l.overallCompletionPct, 0) /
                overview.length,
            )
          : 0,
      notStarted: overview.filter((l) => l.status === 'NOT_STARTED').length,
    };

    return {
      success: true,
      data: { overview, stats },
    };
  }

  @Post('resource/complete')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async markResourceComplete(
    @Body() body: { resourceId: string; timeSpentSeconds?: number },
    @CurrentUser() user: any,
  ) {
    if (!body?.resourceId) {
      throw new BadRequestException('resourceId is required');
    }

    const result = await this.service.markResourceComplete(
      user.id,
      body.resourceId,
      body.timeSpentSeconds ?? 0,
    );

    return { success: true, data: result };
  }

  @Get('me')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getMyProgress(@CurrentUser() user: any) {
    const result = await this.service.getUserProgressSummary(user.id);
    return { success: true, data: result };
  }

  @Get('module/:moduleId')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getModuleProgress(
    @Param('moduleId') moduleId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.service.getModuleProgress(user.id, moduleId);
    return { success: true, data: result };
  }

  @Get('milestone/:milestoneId')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getMilestoneProgress(
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.service.checkMilestoneProgress(
      user.id,
      milestoneId,
    );
    return { success: true, data: result };
  }

  @Get('milestone/:milestoneId/summary')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getMilestoneSummary(
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.service.getMilestoneSummary(
      user.id,
      milestoneId,
    );
    return { success: true, data: result };
  }

  @Get('summary')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getProgressSummary(@CurrentUser() user: any) {
    const result = await this.service.getProgressSummary(user.id);
    return { success: true, data: result };
  }
}
