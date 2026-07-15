import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, UserRole } from '@prisma/client';
import * as sgMail from '@sendgrid/mail';
import { pathReadyTemplate } from './templates/path-ready.template';
import { assessmentCompleteManagerTemplate } from './templates/assessment-complete-manager.template';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly sgMail: typeof sgMail;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY') || '';
    if (apiKey && apiKey !== 'SG....' && !apiKey.startsWith('SG.')) {
      sgMail.setApiKey(apiKey);
    } else {
      this.logger.warn(
        'SendGrid API key not set or placeholder used — email delivery disabled',
      );
    }
    this.sgMail = sgMail;
  }

  private get fromEmail() {
    return (
      this.config.get<string>('SENDGRID_FROM_EMAIL') || 'noreply@learnpath.ai'
    );
  }

  private get appUrl() {
    return this.config.get<string>('APP_URL') || 'http://localhost:3000';
  }

  // ── EMAIL SENDERS ──────────────────────────────────────

  async sendPathReadyEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: { select: { name: true, logoUrl: true } },
        learningPaths: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            title: true,
            totalMilestones: true,
            estimatedHours: true,
          },
        },
      },
    });

    if (!user?.email) return;
    const path = user.learningPaths[0];
    if (!path) return;

    const template = pathReadyTemplate({
      employeeName: user.fullName.split(' ')[0],
      orgName: user.organization.name,
      pathTitle: path.title,
      milestoneCount: path.totalMilestones,
      estimatedHours: path.estimatedHours,
      ctaUrl: `${this.appUrl}/learn/dashboard`,
      orgLogo: user.organization.logoUrl || undefined,
    });

    try {
      const apiKey = this.config.get<string>('SENDGRID_API_KEY');
      if (apiKey && apiKey !== 'SG....' && apiKey.startsWith('SG.')) {
        await this.sgMail.send({
          to: user.email,
          from: this.fromEmail,
          subject: template.subject,
          html: template.html,
        });
        this.logger.log(`Path ready email sent to ${user.email}`);
      } else {
        this.logger.log(
          `Mock: Email to ${user.email} (Path Ready) skipped due to missing API key`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Email send failed: ${error.message}`);
      // Non-fatal — don't throw
    }
  }

  async sendAssessmentCompleteToManager(employeeId: string, assessment: any) {
    // Find the employee's manager
    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId },
      include: {
        organization: {
          include: {
            users: {
              where: { role: { in: [UserRole.MANAGER, UserRole.ORG_ADMIN] } },
              select: { id: true, email: true, fullName: true },
            },
          },
        },
      },
    });

    if (!employee) return;

    const managers = employee.organization.users;
    if (!managers.length) return;

    // Send to all managers in the org
    for (const manager of managers) {
      if (!manager.email) continue;

      const template = assessmentCompleteManagerTemplate({
        managerName: manager.fullName.split(' ')[0],
        employeeName: employee.fullName,
        employeeRole:
          assessment.identifiedRole || employee.jobTitle || 'Employee',
        experienceLevel: assessment.experienceLevel || 'INTERMEDIATE',
        strongAreas: assessment.strongAreas || [],
        weakAreas: assessment.weakAreas || [],
        orgName: employee.organization.name,
        dashboardUrl: `${this.appUrl}/manage/dashboard`,
      });

      try {
        const apiKey = this.config.get<string>('SENDGRID_API_KEY');
        if (apiKey && apiKey !== 'SG....' && apiKey.startsWith('SG.')) {
          await this.sgMail.send({
            to: manager.email,
            from: this.fromEmail,
            subject: template.subject,
            html: template.html,
          });
          this.logger.log(
            `Assessment complete email sent to manager ${manager.email}`,
          );
        } else {
          this.logger.log(
            `Mock: Email to manager ${manager.email} (Assessment Complete) skipped due to missing API key`,
          );
        }
      } catch (error: any) {
        this.logger.error(`Manager email failed: ${error.message}`);
      }
    }
  }

  // ── IN-APP NOTIFICATIONS ───────────────────────────────

  async createNotification(data: {
    userId: string;
    organizationId: string;
    type: NotificationType;
    title: string;
    body: string;
    ctaLabel?: string;
    ctaUrl?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  async createPathReadyNotification(
    userId: string,
    orgId: string,
    pathTitle: string,
  ) {
    return this.createNotification({
      userId,
      organizationId: orgId,
      type: 'PATH_READY',
      title: 'Your learning path is ready! 🎓',
      body: `"${pathTitle}" has been generated and is ready to start.`,
      ctaLabel: 'Start Learning',
      ctaUrl: '/learn/dashboard',
    });
  }

  async createAssessmentCompleteNotification(
    managerId: string,
    orgId: string,
    employeeName: string,
  ) {
    return this.createNotification({
      userId: managerId,
      organizationId: orgId,
      type: 'ASSESSMENT_COMPLETED',
      title: `${employeeName} completed their assessment 📊`,
      body: 'Their AI-generated learning path is being prepared.',
      ctaLabel: 'View Team',
      ctaUrl: '/manage/dashboard',
    });
  }

  // ── READ / FETCH ───────────────────────────────────────

  async getUserNotifications(userId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
