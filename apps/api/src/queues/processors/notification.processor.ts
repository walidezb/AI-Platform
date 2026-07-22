import {
  Processor,
  Process,
  OnQueueFailed,
  OnQueueCompleted,
  OnQueueStalled,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull';
import { NotificationsService } from '../../notifications/notifications.service';
import { AlertsService } from '../../alerts/alerts.service';
import { BillingService } from '../../billing/billing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationService: NotificationsService,
    private readonly alertsService: AlertsService,
    private readonly billingService: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('daily-stalled-alerts')
  async processDailyAlerts(job: Bull.Job): Promise<void> {
    this.logger.log('Processing daily stalled learner alerts...');
    await this.alertsService.runDailyAlerts();
    this.logger.log('Daily stalled alert run complete');
  }

  @Process('stripe-usage-report')
  async processUsageReport(job: Bull.Job): Promise<void> {
    this.logger.log('Running hourly Stripe usage report...');
    await this.billingService.reportAllOrgsUsage();
  }

  @Process('stripe-seat-update')
  async processSeatUpdate(job: Bull.Job): Promise<void> {
    this.logger.log('Running monthly seat count update...');
    const orgs = await this.prisma.organization.findMany({
      where: { stripeSubscriptionId: { not: null } },
      select: { id: true },
    });
    for (const org of orgs) {
      await this.billingService.updateSeatCount(org.id);
    }
  }

  @Process('PATH_READY')
  async handlePathReady(
    job: Bull.Job<{
      userId: string;
      organizationId: string;
      pathId: string;
      pathTitle: string;
      assessment?: any;
    }>,
  ) {
    this.logger.log(`Processing PATH_READY for user ${job.data.userId}`);

    await Promise.all([
      // 1. Send email to employee
      this.notificationService.sendPathReadyEmail(job.data.userId),

      // 2. Create in-app notification for employee
      this.notificationService.createPathReadyNotification(
        job.data.userId,
        job.data.organizationId,
        job.data.pathTitle,
      ),
    ]);

    this.logger.log(`PATH_READY notifications sent for ${job.data.userId}`);
  }

  @Process('ASSESSMENT_COMPLETED')
  async handleAssessmentCompleted(
    job: Bull.Job<{
      userId: string;
      organizationId: string;
      assessment: any;
      employeeName: string;
    }>,
  ) {
    this.logger.log(
      `Processing ASSESSMENT_COMPLETED for ${job.data.employeeName}`,
    );

    // Get all managers in org for in-app notifications
    const managers = await this.notificationService['prisma'].user.findMany({
      where: {
        organizationId: job.data.organizationId,
        role: { in: [UserRole.MANAGER, UserRole.ORG_ADMIN] },
      },
      select: { id: true },
    });

    await Promise.all([
      // 1. Send email to all managers
      this.notificationService.sendAssessmentCompleteToManager(
        job.data.userId,
        job.data.assessment,
      ),

      // 2. Create in-app notification for each manager
      ...managers.map((m) =>
        this.notificationService.createAssessmentCompleteNotification(
          m.id,
          job.data.organizationId,
          job.data.employeeName,
        ),
      ),
    ]);
  }

  @OnQueueCompleted()
  onCompleted(job: Bull.Job) {
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
