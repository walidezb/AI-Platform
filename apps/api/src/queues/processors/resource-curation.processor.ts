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
import { ResourceCurationPayload } from '../queue.types';

@Processor(QUEUE_NAMES.RESOURCE_CURATION)
export class ResourceCurationProcessor {
  private readonly logger = new Logger(ResourceCurationProcessor.name);

  @Process({ name: JOB_NAMES.CURATE_MODULE_RESOURCES, concurrency: 2 })
  async handleResourceCuration(job: Bull.Job<ResourceCurationPayload>) {
    this.logger.log(`Curating resources for module: ${job.data.moduleId}`);
    // TODO Phase 3: curate resources using AI
    this.logger.log(
      `Resources for module ${job.data.moduleId} curated successfully`,
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
