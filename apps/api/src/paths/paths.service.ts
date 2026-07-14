import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GeneratedPathDto {
  title: string;
  description: string;
  domain: string;
  estimatedHours: number;
  milestones: Array<{
    sequenceOrder: number;
    title: string;
    description: string;
    learningObjectives: string[];
    estimatedHours: number;
    modules: Array<{
      sequenceOrder: number;
      title: string;
      description: string;
      moduleType: any;
      estimatedMinutes: number;
      resources: Array<{
        title: string;
        url: string;
        sourcePlatform: string;
        description: string;
        resourceType: any;
        durationMinutes?: number | null;
        qualityScore: number;
        language?: string;
      }>;
    }>;
    exercises: Array<{
      title: string;
      instructions: string;
      exerciseType: any;
      scenarioContext?: string | null;
      rubric: Array<{
        criterion: string;
        weight: number;
        description: string;
        excellent: string;
        acceptable: string;
      }>;
      passingScore: number;
    }>;
  }>;
}

@Injectable()
export class PathsService {
  private readonly logger = new Logger(PathsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async savePath(data: {
    assessmentId: string;
    userId: string;
    organizationId: string;
    path: GeneratedPathDto;
  }) {
    const { assessmentId, userId, organizationId, path } = data;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create the LearningPath record
      const learningPath = await tx.learningPath.create({
        data: {
          userId,
          organizationId,
          assessmentId,
          title: path.title,
          description: path.description,
          domain: path.domain,
          estimatedHours: path.estimatedHours,
          totalMilestones: path.milestones.length,
          status: 'ACTIVE',
          generatedByAi: true,
        },
      });

      // 2. Create milestones, modules, resources, exercises
      for (const [mIdx, milestone] of path.milestones.entries()) {
        const createdMilestone = await tx.milestone.create({
          data: {
            learningPathId: learningPath.id,
            sequenceOrder: milestone.sequenceOrder,
            title: milestone.title,
            description: milestone.description,
            learningObjectives: milestone.learningObjectives,
            estimatedHours: milestone.estimatedHours,
            isLocked: mIdx > 0, // first milestone unlocked
          },
        });

        // Create modules for this milestone
        for (const [modIdx, module] of milestone.modules.entries()) {
          const createdModule = await tx.module.create({
            data: {
              milestoneId: createdMilestone.id,
              sequenceOrder: module.sequenceOrder,
              title: module.title,
              description: module.description,
              moduleType: module.moduleType,
              estimatedMinutes: module.estimatedMinutes,
              isLocked: mIdx > 0 || modIdx > 0, // first module of first milestone unlocked
            },
          });

          // Create resources for this module
          for (const [rIdx, resource] of module.resources.entries()) {
            await tx.resource.create({
              data: {
                moduleId: createdModule.id,
                title: resource.title,
                url: resource.url,
                sourcePlatform: resource.sourcePlatform,
                description: resource.description,
                resourceType: resource.resourceType,
                durationMinutes: resource.durationMinutes || null,
                qualityScore: resource.qualityScore,
                language: (resource.language === 'AR' ? 'AR' : 'EN'),
                sequenceOrder: rIdx + 1,
              },
            });
          }
        }

        // Create exercises for this milestone
        for (const exercise of milestone.exercises) {
          await tx.exercise.create({
            data: {
              milestoneId: createdMilestone.id,
              title: exercise.title,
              instructions: exercise.instructions,
              exerciseType: exercise.exerciseType,
              scenarioContext: exercise.scenarioContext || null,
              rubric: JSON.parse(JSON.stringify(exercise.rubric)),
              passingScore: exercise.passingScore,
              maxAttempts: 3,
              isLocked: mIdx > 0,
            },
          });
        }
      }

      // 3. Create UserProgress record
      const firstMilestone = await tx.milestone.findFirst({
        where: { learningPathId: learningPath.id, sequenceOrder: 1 },
      });
      const firstModule = await tx.module.findFirst({
        where: { milestoneId: firstMilestone?.id, sequenceOrder: 1 },
      });

      await tx.userProgress.upsert({
        where: { userId },
        create: {
          userId,
          learningPathId: learningPath.id,
          currentMilestoneId: firstMilestone?.id || null,
          currentModuleId: firstModule?.id || null,
          status: 'NOT_STARTED',
          overallCompletionPct: 0,
        },
        update: {
          learningPathId: learningPath.id,
          currentMilestoneId: firstMilestone?.id || null,
          currentModuleId: firstModule?.id || null,
          status: 'NOT_STARTED',
          overallCompletionPct: 0,
        },
      });

      // 4. Log AI token usage (estimate)
      await tx.aiUsageLog.create({
        data: {
          organizationId,
          userId,
          feature: 'PATH_GENERATION',
          modelUsed: 'gpt-4o',
          tokensInput: 2000, // estimated
          tokensOutput: 4000, // estimated
          costUsd: 0.09, // estimated ($0.09 per path gen)
        },
      });

      this.logger.log(
        `✅ Path saved: ${learningPath.id} | ` +
          `${path.milestones.length} milestones | ` +
          `${path.milestones.reduce((a, m) => a + m.modules.length, 0)} modules`,
      );

      return learningPath;
    });
  }

  async getUserPath(userId: string) {
    return this.prisma.learningPath.findFirst({
      where: { userId, status: { not: 'ARCHIVED' } },
      include: {
        milestones: {
          orderBy: { sequenceOrder: 'asc' },
          include: {
            modules: {
              orderBy: { sequenceOrder: 'asc' },
              include: {
                resources: { orderBy: { sequenceOrder: 'asc' } },
              },
            },
            exercises: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPathById(id: string, requestingUser: any) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        milestones: {
          orderBy: { sequenceOrder: 'asc' },
          include: {
            modules: {
              orderBy: { sequenceOrder: 'asc' },
              include: { resources: { orderBy: { sequenceOrder: 'asc' } } },
            },
            exercises: true,
            _count: { select: { completions: true } },
          },
        },
      },
    });
    if (!path) throw new NotFoundException('Learning path not found');

    // Access control: own path or manager in same org
    const isSelf = path.userId === requestingUser.id;
    const isManager = ['MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN'].includes(
      requestingUser.role,
    );
    const isSameOrg = path.organizationId === requestingUser.organizationId;

    if (!isSelf && !(isManager && isSameOrg)) {
      throw new ForbiddenException();
    }
    return path;
  }
}
