import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AlertSettings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateAlertSettingsDto } from './dto/update-alert-settings.dto';

export interface StalledLearner {
  userId: string;
  fullName: string;
  email: string;
  department: string | null;
  jobTitle: string | null;
  pathTitle: string;
  completionPct: number;
  daysSinceActive: number | null;
  lastActivityAt: Date | null;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly notifs: NotificationsService,
  ) {}

  /* ─── Detect stalled learners for one org ─── */
  async detectStalledLearners(orgId: string): Promise<StalledLearner[]> {
    const settings = await this.prisma.alertSettings.findUnique({
      where: { organizationId: orgId },
    });
    const stalledAfterDays = settings?.stalledAfterDays ?? 7;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - stalledAfterDays);

    const stalledProgress = await this.prisma.userProgress.findMany({
      where: {
        user: { organizationId: orgId },
        status: 'IN_PROGRESS',
        OR: [{ lastActivityAt: { lt: cutoff } }, { lastActivityAt: null }],
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            department: { select: { name: true } },
            jobTitle: true,
          },
        },
        learningPath: {
          select: { title: true, domain: true },
        },
      },
    });

    return stalledProgress.map((p) => {
      const daysSinceActive = p.lastActivityAt
        ? Math.floor(
            (Date.now() - p.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24),
          )
        : null;

      return {
        userId: p.user.id,
        fullName: p.user.fullName,
        email: p.user.email,
        department: p.user.department?.name ?? null,
        jobTitle: p.user.jobTitle,
        pathTitle: p.learningPath?.title ?? 'Unknown Path',
        completionPct: p.overallCompletionPct,
        daysSinceActive,
        lastActivityAt: p.lastActivityAt,
      };
    });
  }

  /* ─── Send manager digest email ─── */
  async sendStalledManagerAlert(
    orgId: string,
    stalled: StalledLearner[],
  ): Promise<void> {
    if (stalled.length === 0) return;

    const managers = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: { in: ['MANAGER', 'ORG_ADMIN'] },
      },
      select: { id: true, fullName: true, email: true },
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    for (const manager of managers) {
      // In-app notification
      await this.notifs.createNotification({
        userId: manager.id,
        organizationId: orgId,
        type: 'STALLED_ALERT',
        title: `⚠️ ${stalled.length} learner${stalled.length > 1 ? 's' : ''} stalled`,
        body: `${stalled.length} employee${stalled.length > 1 ? 's have' : ' has'} been inactive for 7+ days: ${stalled
          .slice(0, 3)
          .map((s) => s.fullName)
          .join(', ')}${stalled.length > 3 ? ` and ${stalled.length - 3} more` : ''}.`,
        ctaLabel: 'View Analytics',
        ctaUrl: '/manage/analytics',
      });

      // Email
      await this.email.sendStalledManagerAlert({
        to: manager.email,
        managerName: manager.fullName,
        stalled,
        dashboardUrl: `${appUrl}/manage/analytics`,
      });

      this.logger.log(
        `Stalled alert sent to manager ${manager.email} ` +
          `for ${stalled.length} employees in org ${orgId}`,
      );
    }
  }

  /* ─── Send nudge email to one employee ─── */
  async sendLearnerNudge(
    employeeId: string,
    triggeredBy: 'SCHEDULED' | 'MANUAL' = 'MANUAL',
  ): Promise<void> {
    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId },
      include: {
        progress: {
          include: {
            learningPath: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    const progress = employee.progress;
    const pathId = progress?.learningPath?.id;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resumeUrl = pathId
      ? `${appUrl}/learn/path/${pathId}`
      : `${appUrl}/learn`;

    await this.email.sendLearnerNudge({
      to: employee.email,
      employeeName: employee.fullName,
      pathTitle: progress?.learningPath?.title ?? 'your learning path',
      completionPct: progress?.overallCompletionPct ?? 0,
      resumeUrl,
      triggeredBy,
    });

    this.logger.log(
      `Nudge email sent to employee ${employee.email} (${triggeredBy})`,
    );
  }

  /* ─── Run full detection + alert for all orgs ─── */
  async runDailyAlerts(): Promise<void> {
    this.logger.log('Starting daily stalled learner detection...');

    const orgs = await this.prisma.organization.findMany({
      where: {
        users: {
          some: {
            role: 'LEARNER',
            progress: {
              status: 'IN_PROGRESS',
            },
          },
        },
      },
      include: { alertSettings: true },
    });

    let totalAlerted = 0;

    for (const org of orgs) {
      if (org.alertSettings?.enableManagerAlerts === false) continue;

      try {
        const stalled = await this.detectStalledLearners(org.id);
        if (stalled.length === 0) continue;

        await this.sendStalledManagerAlert(org.id, stalled);

        if (org.alertSettings?.enableLearnerNudges !== false) {
          for (const employee of stalled) {
            try {
              await this.sendLearnerNudge(employee.userId, 'SCHEDULED');
            } catch (err) {
              this.logger.warn(
                `Failed to nudge ${employee.email}: ${err}`,
              );
            }
          }
        }

        totalAlerted += stalled.length;
        this.logger.log(
          `Org "${org.name}": ${stalled.length} stalled learners alerted`,
        );
      } catch (err) {
        this.logger.error(`Alert run failed for org ${org.id}: ${err}`);
      }
    }

    this.logger.log(`Daily alert run complete. Total stalled: ${totalAlerted}`);
  }

  /* ─── Get stalled list for API ─── */
  async getStalledForOrg(orgId: string): Promise<StalledLearner[]> {
    return this.detectStalledLearners(orgId);
  }

  /* ─── Get / upsert alert settings ─── */
  async getSettings(orgId: string): Promise<AlertSettings> {
    return this.prisma.alertSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId },
      update: {},
    });
  }

  async updateSettings(
    orgId: string,
    dto: UpdateAlertSettingsDto,
  ): Promise<AlertSettings> {
    return this.prisma.alertSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, ...dto },
      update: dto,
    });
  }
}
