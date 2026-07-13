import { Processor, Process, OnQueueFailed, OnQueueCompleted, OnQueueStalled } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull';
import { QUEUE_NAMES, JOB_NAMES } from '../queue.constants';
import { PathGenerationPayload } from '../queue.types';

@Processor(QUEUE_NAMES.PATH_GENERATION)
export class PathGenerationProcessor {
  private readonly logger = new Logger(PathGenerationProcessor.name);

  @Process(JOB_NAMES.GENERATE_PATH)
  async handlePathGeneration(job: Bull.Job<PathGenerationPayload>) {
    this.logger.log(`Generating path for user: ${job.data.userId}`);
    // TODO Phase 3: generate path using AI
    this.logger.log(`Path for user ${job.data.userId} generated successfully`);
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
