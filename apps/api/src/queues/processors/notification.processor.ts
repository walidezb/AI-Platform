import { Processor, Process, OnQueueFailed, OnQueueCompleted, OnQueueStalled } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull';
import { QUEUE_NAMES } from '../queue.constants';
import { NotificationPayload } from '../queue.types';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  @Process('*') // Handles all notification job names
  async handleNotification(job: Bull.Job<NotificationPayload>) {
    const type = job.name.split('.').pop() || job.data.type;
    this.logger.log(`Sending notification type: ${type} to user: ${job.data.userId}`);
    // TODO Phase 3: trigger notification delivery
    this.logger.log(`Notification of type ${type} sent to user ${job.data.userId} successfully`);
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
