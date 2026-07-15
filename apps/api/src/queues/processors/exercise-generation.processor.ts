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
import { ExerciseGenerationPayload } from '../queue.types';

@Processor(QUEUE_NAMES.EXERCISE_GENERATION)
export class ExerciseGenerationProcessor {
  private readonly logger = new Logger(ExerciseGenerationProcessor.name);

  @Process(JOB_NAMES.GENERATE_EXERCISES)
  async handleExerciseGeneration(job: Bull.Job<ExerciseGenerationPayload>) {
    this.logger.log(
      `Generating exercises for milestone: ${job.data.milestoneId}`,
    );
    // TODO Phase 3: generate exercises using AI
    this.logger.log(
      `Exercises for milestone ${job.data.milestoneId} generated successfully`,
    );
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
