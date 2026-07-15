import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  Logger,
  Query,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PathsService } from './paths.service';
import { QueueService } from '../queues/queue.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class PathsController {
  private readonly logger = new Logger(PathsController.name);

  constructor(
    private readonly service: PathsService,
    private readonly config: ConfigService,
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('internal/paths/save')
  @Public()
  @SkipThrottle()
  async savePath(
    @Body() body: any,
    @Headers('x-internal-secret') secret: string,
  ) {
    if (secret !== this.config.get('AI_SERVICE_SECRET')) {
      throw new UnauthorizedException();
    }

    try {
      const path = await this.service.savePath(body);

      // Queue notification job
      await this.queue.add('PATH_READY', {
        userId: body.userId,
        organizationId: body.organizationId,
        pathId: path.id,
        pathTitle: path.title,
      });

      return { success: true, pathId: path.id };
    } catch (error: any) {
      this.logger.error(`Path save failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to save learning path');
    }
  }

  // For frontend to retrieve user's learning path
  @Get('paths/my')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getMyPath(@CurrentUser() user: any) {
    const path = await this.service.getUserPath(user.id);
    return { success: true, data: path };
  }

  @Get('progress/me')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getMyProgress(@CurrentUser() user: any) {
    const progress = await this.prisma.userProgress.findUnique({
      where: { userId: user.id },
      include: {
        learningPath: {
          select: { title: true, totalMilestones: true, estimatedHours: true }
        }
      }
    });
    return { success: true, data: progress };
  }

  @Get('paths/:id')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getPath(@Param('id') id: string, @CurrentUser() user: any) {
    const path = await this.service.getPathById(id, user);
    return { success: true, data: path };
  }

  @Get('search/resources')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async searchResources(
    @Query('q') q: string,
    @Query('domain') domain?: string,
    @Query('level') level?: string,
  ) {
    if (!q || q.length < 2) {
      throw new BadRequestException('Query must be at least 2 characters');
    }

    const aiUrl = `${this.config.get('AI_SERVICE_URL')}/search/resources`;
    const params = new URLSearchParams({ q, limit: '8' });
    if (domain) params.set('domain', domain);
    if (level) params.set('level', level);

    const res = await fetch(`${aiUrl}?${params}`);
    return res.json();
  }

  @Post('milestones/:milestoneId/exercises/regenerate')
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  async regenerateExercises(
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: any,
  ) {
    // Get milestone with its path and context
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        learningPath: {
          include: {
            user: { select: { jobTitle: true, preferredLanguage: true } },
            assessment: { select: { experienceLevel: true } }
          }
        },
        modules: { select: { title: true, moduleType: true } },
        exercises: true,
      }
    });

    if (!milestone) throw new NotFoundException();

    // Verify org access
    if (milestone.learningPath.organizationId !== user.organizationId
        && user.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException();
    }

    // Call AI service
    const aiUrl = `${this.config.get('AI_SERVICE_URL')}/exercise/generate`;
    const res = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        milestoneTitle: milestone.title,
        milestoneDescription: milestone.description,
        learningObjectives: milestone.learningObjectives,
        modules: milestone.modules,
        domain: milestone.learningPath.domain,
        experienceLevel: milestone.learningPath.assessment?.experienceLevel || 'INTERMEDIATE',
        jobRole: milestone.learningPath.user.jobTitle || 'Professional',
        exerciseCount: 2,
      }),
    });

    if (!res.ok) throw new ServiceUnavailableException('AI service error');
    const { exercises } = await res.json();

    // Replace existing exercises in DB
    await this.prisma.$transaction([
      this.prisma.exercise.deleteMany({ where: { milestoneId } }),
      this.prisma.exercise.createMany({
        data: exercises.map((ex: any) => ({
          milestoneId,
          title: ex.title,
          instructions: ex.instructions,
          exerciseType: ex.exerciseType,
          difficultyLevel: ex.difficultyLevel,
          estimatedMinutes: ex.estimatedMinutes,
          scenarioContext: ex.scenarioContext,
          multipleChoiceOptions: ex.multipleChoiceOptions,
          rubric: ex.rubric,
          sampleAnswer: ex.sampleAnswer,
          hints: ex.hints,
          passingScore: ex.passingScore,
          maxAttempts: ex.maxAttempts,
          tags: ex.tags,
        }))
      }),
    ]);

    return {
      success: true,
      message: `Regenerated ${exercises.length} exercises`,
    };
  }
}
