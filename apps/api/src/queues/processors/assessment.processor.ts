import { Processor, Process, OnQueueFailed, OnQueueCompleted, OnQueueStalled } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Bull from 'bull';
import { QUEUE_NAMES, JOB_NAMES } from '../queue.constants';
import { AssessmentCompletedPayload } from '../queue.types';

@Processor(QUEUE_NAMES.ASSESSMENT)
export class AssessmentProcessor {
  private readonly logger = new Logger(AssessmentProcessor.name);

  constructor(private readonly config: ConfigService) {}

  @Process(JOB_NAMES.ASSESSMENT_COMPLETED)
  async handleAssessmentCompleted(job: Bull.Job<AssessmentCompletedPayload>) {
    this.logger.log(
      `Processing assessment ${job.data.assessmentId} for user ${job.data.userId}`
    );

    // Trigger path generation in AI service
    const aiUrl = `${this.config.get('AI_SERVICE_URL')}/path/generate`;

    try {
      const res = await fetch(aiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentId: job.data.assessmentId,
          userId: job.data.userId,
          organizationId: job.data.organizationId,
          skillProfile: job.data.skillProfile,
        }),
        signal: AbortSignal.timeout(300000), // 5 min timeout
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`AI service returned ${res.status}: ${err}`);
      }

      const result: any = await res.json();
      this.logger.log(
        `Path generation triggered: ${result.pathTitle} ` +
        `(${result.milestoneCount} milestones, ${result.estimatedHours}h)`
      );
    } catch (error: any) {
      this.logger.error(`Path generation failed: ${error.message}`);
      throw error;  // BullMQ will retry
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Bull.Job, result: any) {
    this.logger.log(`Job ${job.id} completed in ${job.queue.name}`);
  }

  @OnQueueFailed()
  onFailed(job: Bull.Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed in ${job.queue.name}: ${error.message}`,
      error.stack,
    );
  }

  @OnQueueStalled()
  onStalled(job: Bull.Job) {
    this.logger.warn(`Job ${job.id} stalled in ${job.queue.name}`);
  }
}
