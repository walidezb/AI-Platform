import {
  Processor,
  Process,
  OnQueueFailed,
  OnQueueCompleted,
  OnQueueStalled,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull';
import { QUEUE_NAMES, JOB_NAMES } from '../queue.constants';
import { PathGenerationPayload } from '../queue.types';
import { PrismaService } from '../../prisma/prisma.service';

import { PostHogService } from '../../common/posthog.service';

@Processor(QUEUE_NAMES.PATH_GENERATION)
export class PathGenerationProcessor {
  private readonly logger = new Logger(PathGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly posthog: PostHogService,
  ) {}

  @Process(JOB_NAMES.GENERATE_PATH)
  async handlePathGeneration(job: Bull.Job<PathGenerationPayload>) {
    this.logger.log(`Generating path for user: ${job.data.userId}`);
    this.logger.log(`Path for user ${job.data.userId} generated successfully`);
  }

  @OnQueueCompleted()
  async onCompleted(job: Bull.Job<PathGenerationPayload>, result: any) {
    const durationMs = Date.now() - job.timestamp;

    this.logger.log(`[PathGen] Job ${job.id} completed in ${durationMs}ms`);

    this.posthog.capture({
      distinctId: job.data.userId,
      event: 'path_generated',
      properties: {
        path_id: result?.pathId,
        duration_ms: durationMs,
        duration_minutes: Math.round((durationMs / 60_000) * 10) / 10,
        milestone_count: result?.milestoneCount,
        module_count: result?.moduleCount,
        org_id: job.data.organizationId,
        assessment_id: job.data.assessmentId,
      },
    });
  }

  @OnQueueFailed()
  async onFailed(job: Bull.Job<PathGenerationPayload>, error: Error) {
    const maxAttempts = job.opts.attempts ?? 3;

    this.logger.error(
      `[PathGen] Job ${job.id} failed ` +
        `(attempt ${job.attemptsMade}/${maxAttempts}): ${error.message}`,
      error.stack,
    );

    if (job.attemptsMade < maxAttempts) {
      this.logger.warn(
        `[PathGen] Job ${job.id} will retry ` +
          `(${maxAttempts - job.attemptsMade} attempts remaining)`,
      );
      return;
    }

    this.logger.error(
      `[PathGen] Job ${job.id} PERMANENTLY FAILED after ${maxAttempts} attempts`,
    );

    const { assessmentId, userId, organizationId } = job.data;

    // 1. Mark Assessment as FAILED
    if (assessmentId) {
      try {
        await this.prisma.assessment.update({
          where: { id: assessmentId },
          data: {
            status: 'FAILED',
            skillProfile: {
              _error: error.message,
              _failedAt: new Date().toISOString(),
              _attempts: job.attemptsMade,
              _jobId: String(job.id),
            },
          },
        });
        this.logger.log(`[PathGen] Assessment ${assessmentId} marked FAILED`);
      } catch (dbErr) {
        this.logger.error(
          `[PathGen] Could not mark assessment ${assessmentId} as FAILED`,
          dbErr,
        );
      }
    }

    // 2. Notify learner
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          organizationId,
          type: 'PATH_GENERATION_FAILED',
          title: 'Path Generation Issue',
          body:
            'We encountered an issue creating your learning path. ' +
            'Our team has been alerted. Please try restarting your ' +
            'assessment in a few minutes.',
          isRead: false,
          ctaUrl: '/onboarding/setup',
          ctaLabel: 'Restart Assessment',
        },
      });
    } catch (notifErr) {
      this.logger.error('[PathGen] Could not create user notification', notifErr);
    }

    // 3. Alert platform admins
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'PLATFORM_ADMIN' },
        select: { id: true, email: true },
      });

      for (const admin of admins) {
        await this.prisma.notification.create({
          data: {
            userId: admin.id,
            organizationId,
            type: 'ADMIN_ALERT',
            title: 'Path Generation Failed',
            body:
              `Path generation permanently failed for user ${userId} ` +
              `(org: ${organizationId}). Error: ${error.message}`,
            isRead: false,
            ctaUrl: '/admin/dashboard',
            ctaLabel: 'View Dashboard',
          },
        });
      }
    } catch (adminErr) {
      this.logger.error('[PathGen] Could not alert admins', adminErr);
    }
  }

  @OnQueueStalled()
  onStalled(job: Bull.Job) {
    this.logger.warn(`Job ${job.id} stalled in ${job.queue.name}`);
  }
}
