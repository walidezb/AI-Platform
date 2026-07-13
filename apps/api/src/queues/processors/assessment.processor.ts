import { Processor, Process, OnQueueFailed, OnQueueCompleted, OnQueueStalled } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull';
import { QUEUE_NAMES, JOB_NAMES } from '../queue.constants';
import { AssessmentCompletedPayload } from '../queue.types';

@Processor(QUEUE_NAMES.ASSESSMENT)
export class AssessmentProcessor {
  private readonly logger = new Logger(AssessmentProcessor.name);

  @Process(JOB_NAMES.ASSESSMENT_COMPLETED)
  async handleAssessmentCompleted(job: Bull.Job<AssessmentCompletedPayload>) {
    this.logger.log(`Processing assessment completed: ${job.data.assessmentId}`);
    // TODO Phase 3: trigger path generation
    this.logger.log(`Assessment ${job.data.assessmentId} processed successfully`);
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
