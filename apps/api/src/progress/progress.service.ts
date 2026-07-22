import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async markResourceComplete(
    userId: string,
    resourceId: string,
    timeSpentSeconds?: number,
  ) {
    // Fetch resource to get moduleId
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      select: { id: true, moduleId: true },
    });
    if (!resource) throw new NotFoundException('Resource not found');

    // Idempotent upsert
    const completion = await this.prisma.resourceCompletion.upsert({
      where: {
        userId_resourceId: { userId, resourceId },
      },
      create: {
        userId,
        resourceId,
        moduleId: resource.moduleId,
        timeSpentSeconds: timeSpentSeconds ?? 0,
      },
      update: {
        timeSpentSeconds: timeSpentSeconds ?? 0,
      },
    });

    // Update UserProgress.lastActivityAt
    await this.prisma.userProgress.updateMany({
      where: { userId },
      data: { lastActivityAt: new Date() },
    });

    // Check if all resources in this module are now complete
    const [totalResources, completedResources] = await Promise.all([
      this.prisma.resource.count({
        where: { moduleId: resource.moduleId },
      }),
      this.prisma.resourceCompletion.count({
        where: { userId, moduleId: resource.moduleId },
      }),
    ]);

    const isModuleComplete = completedResources >= totalResources;

    return {
      completion,
      isModuleComplete,
      completedCount: completedResources,
      totalCount: totalResources,
    };
  }

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
}
