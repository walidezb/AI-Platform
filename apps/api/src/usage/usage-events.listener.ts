import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole, NotificationType } from '@prisma/client';

@Injectable()
export class UsageEventsListener {
  private readonly logger = new Logger(UsageEventsListener.name);

  // Deduplicate: only send one warning email per day per org
  private warningSentToday = new Set<string>();

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly notifService: NotificationsService,
  ) {}

  @OnEvent('usage.near_limit')
  async handleNearLimit(payload: {
    organizationId: string;
    percentUsed: number;
    used: number;
    budget: number;
    remainingUsd: number;
  }) {
    const { organizationId, percentUsed, used, budget, remainingUsd } = payload;

    // Deduplicate — only warn once per day
    if (this.warningSentToday.has(organizationId)) return;
    this.warningSentToday.add(organizationId);

    // Reset dedup set at midnight / 24 hours
    setTimeout(
      () => {
        this.warningSentToday.delete(organizationId);
      },
      24 * 60 * 60 * 1000,
    );

    this.logger.warn(
      `Budget warning for org ${organizationId}: ${percentUsed.toFixed(1)}% used`,
    );

    // Find all ORG_ADMIN and MANAGER users for this org
    const admins = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: [UserRole.ORG_ADMIN, UserRole.MANAGER] },
      },
      select: { id: true, email: true, fullName: true },
    });

    for (const admin of admins) {
      // 1. In-app notification
      await this.notifService.createNotification({
        userId: admin.id,
        organizationId,
        type: NotificationType.BUDGET_WARNING,
        title: '⚠️ AI Budget at 80%',
        body:
          `Your organization has used ${percentUsed.toFixed(0)}% of its ` +
          `monthly AI budget ($${used.toFixed(2)} of $${budget.toFixed(2)}). ` +
          `$${remainingUsd.toFixed(2)} remaining. Contact us to increase your limit.`,
        ctaLabel: 'View Settings',
        ctaUrl: '/manage/settings',
      });

      // 2. Email alert
      await this.emailService.sendBudgetWarningEmail({
        to: admin.email,
        name: admin.fullName,
        percentUsed,
        usedUsd: used,
        budgetUsd: budget,
        remainingUsd,
      });
    }
  }

  @OnEvent('usage.exceeded')
  async handleExceeded(payload: {
    organizationId: string;
    used: number;
    budget: number;
  }) {
    this.logger.error(
      `BUDGET EXCEEDED for org ${payload.organizationId}: ` +
        `$${payload.used.toFixed(2)} / $${payload.budget.toFixed(2)}`,
    );

    const admins = await this.prisma.user.findMany({
      where: {
        organizationId: payload.organizationId,
        role: { in: [UserRole.ORG_ADMIN] },
      },
      select: { id: true, email: true, fullName: true },
    });

    for (const admin of admins) {
      await this.notifService.createNotification({
        userId: admin.id,
        organizationId: payload.organizationId,
        type: NotificationType.BUDGET_EXCEEDED,
        title: '🚫 AI Budget Exceeded',
        body:
          `Your organization's AI budget of $${payload.budget.toFixed(2)} ` +
          `has been exceeded. AI features are now paused. ` +
          `Please increase your budget to resume.`,
        ctaLabel: 'Increase Budget',
        ctaUrl: '/manage/settings',
      });

      await this.emailService.sendBudgetExceededEmail({
        to: admin.email,
        name: admin.fullName,
        usedUsd: payload.used,
        budgetUsd: payload.budget,
      });
    }
  }
}
