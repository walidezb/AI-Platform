import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { User, InviteStatus } from '@prisma/client';

export interface InvitationRow {
  userId: string;
  fullName: string;
  email: string;
  department: string | null;
  jobTitle: string | null;
  invitedAt: Date | null;
  expiresAt: Date | null;
  inviteOpenedAt: Date | null;
  completedAt: Date | null;
  inviteStatus: InviteStatus;
  onboardingLink: string | null;
  isExpired: boolean;
}

export interface InviteStats {
  total: number;
  pending: number;
  inProgress: number;
  accepted: number;
  revoked: number;
  expired: number;
}

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  private generateToken(): string {
    return randomUUID().replace(/-/g, ''); // 32-char hex token
  }

  private buildInviteUrl(token: string): string {
    const appUrl =
      this.config.get<string>('APP_URL') || 'http://localhost:3000';
    return `${appUrl}/onboarding/${token}`;
  }

  /* ─── Computed invite status ─── */
  computeInviteStatus(user: any): InviteStatus {
    if (
      user.onboardingCompletedAt ||
      user.inviteStatus === 'ACCEPTED' ||
      user.invitationStatus === 'ACCEPTED'
    ) {
      return 'ACCEPTED';
    }
    if (
      user.inviteStatus === 'REVOKED' ||
      user.invitationStatus === 'REVOKED'
    ) {
      return 'REVOKED';
    }

    const expiry =
      user.inviteExpiresAt ??
      user.onboardingTokenExpiry ??
      (user.invitedAt
        ? new Date(new Date(user.invitedAt).getTime() + 14 * 24 * 60 * 60 * 1000)
        : null);

    if (expiry && new Date() > new Date(expiry) && !user.onboardingCompletedAt) {
      return 'EXPIRED';
    }

    if (
      user.inviteOpenedAt ||
      user.inviteStatus === 'IN_PROGRESS' ||
      user.invitationStatus === 'IN_PROGRESS'
    ) {
      return 'IN_PROGRESS';
    }

    return user.inviteStatus ?? 'PENDING';
  }

  async inviteEmployee(
    dto: InviteEmployeeDto,
    managerId: string,
    orgId: string,
  ) {
    const manager = await this.prisma.user.findUnique({
      where: { id: managerId },
      include: { organization: true },
    });

    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, organizationId: orgId },
    });

    if (
      existing &&
      (existing.onboardingCompletedAt ||
        existing.invitationStatus === 'ACCEPTED' ||
        existing.inviteStatus === 'ACCEPTED')
    ) {
      throw new ConflictException(
        'This employee has already joined the platform',
      );
    }

    const token = this.generateToken();
    const now = new Date();
    const expiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

    let user: User;
    if (existing) {
      user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          onboardingToken: token,
          onboardingTokenExpiry: expiry,
          inviteExpiresAt: expiry,
          invitedAt: now,
          inviteStatus: 'PENDING',
          invitationStatus: 'PENDING',
          fullName: dto.fullName,
          departmentId: dto.departmentId || null,
          jobTitle: dto.jobTitle || null,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          organizationId: orgId,
          email: dto.email,
          fullName: dto.fullName,
          clerkId: `pending_${token}`,
          role: 'LEARNER',
          departmentId: dto.departmentId || null,
          jobTitle: dto.jobTitle || null,
          onboardingToken: token,
          onboardingTokenExpiry: expiry,
          inviteExpiresAt: expiry,
          invitedAt: now,
          inviteStatus: 'PENDING',
          invitationStatus: 'PENDING',
        },
      });
    }

    const inviteLink = this.buildInviteUrl(token);

    this.email
      .sendInviteEmail({
        to: dto.email,
        employeeName: dto.fullName,
        managerName: manager.fullName,
        orgName: manager.organization.name,
        inviteLink,
        jobTitle: dto.jobTitle || undefined,
      })
      .catch((err) => console.error('Email send failed:', err));

    return { userId: user.id, inviteLink, token };
  }

  async bulkInvite(
    employees: InviteEmployeeDto[],
    managerId: string,
    orgId: string,
  ) {
    const results = await Promise.allSettled(
      employees.map((emp) => this.inviteEmployee(emp, managerId, orgId)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { succeeded, failed, total: employees.length };
  }

  async validateToken(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        onboardingToken: token,
        onboardingTokenExpiry: { gte: new Date() },
      },
      include: {
        organization: { select: { name: true, logoUrl: true, industry: true } },
        department: { select: { name: true } },
      },
    });

    if (!user)
      return { valid: false, reason: 'Token is invalid or has expired' };

    const status = this.computeInviteStatus(user);

    if (status === 'REVOKED') {
      return { valid: false, reason: 'This invitation has been revoked' };
    }
    if (status === 'ACCEPTED') {
      return { valid: false, reason: 'This invitation has already been used' };
    }

    return {
      valid: true,
      userId: user.id,
      employeeName: user.fullName,
      jobTitle: user.jobTitle,
      department: user.department?.name,
      orgName: user.organization.name,
      orgLogo: user.organization.logoUrl,
      orgIndustry: user.organization.industry,
      isReturning: status === 'IN_PROGRESS',
    };
  }

  async revokeInvite(userId: string, managerId: string, orgId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
    });
    if (!user) throw new NotFoundException('Employee not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        inviteStatus: 'REVOKED',
        invitationStatus: 'REVOKED',
        onboardingToken: null,
        onboardingTokenExpiry: null,
      },
    });
  }

  async resendInvite(userId: string, managerId: string, orgId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
    });
    if (!user) throw new NotFoundException('Employee not found');

    const status = this.computeInviteStatus(user);
    if (status === 'ACCEPTED') {
      throw new BadRequestException(
        'Employee has already accepted the invitation',
      );
    }

    const dto: InviteEmployeeDto = {
      email: user.email,
      fullName: user.fullName,
      jobTitle: user.jobTitle || undefined,
      departmentId: user.departmentId || undefined,
    };
    return this.inviteEmployee(dto, managerId, orgId);
  }

  /* ─── Invite stats ─── */
  async getInviteStats(orgId: string): Promise<InviteStats> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: 'LEARNER',
      },
      select: {
        inviteStatus: true,
        invitationStatus: true,
        invitedAt: true,
        inviteExpiresAt: true,
        onboardingTokenExpiry: true,
        inviteOpenedAt: true,
        onboardingCompletedAt: true,
      },
    });

    const statuses = users.map((u) => this.computeInviteStatus(u));

    return {
      total: users.length,
      pending: statuses.filter((s) => s === 'PENDING').length,
      inProgress: statuses.filter((s) => s === 'IN_PROGRESS').length,
      accepted: statuses.filter((s) => s === 'ACCEPTED').length,
      revoked: statuses.filter((s) => s === 'REVOKED').length,
      expired: statuses.filter((s) => s === 'EXPIRED').length,
    };
  }

  /* ─── List invitations with computed status ─── */
  async listInvitations(orgId: string): Promise<InvitationRow[]> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: 'LEARNER',
      },
      include: {
        department: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000';

    return users.map((u) => {
      const computedStatus = this.computeInviteStatus(u);
      const expiry =
        u.inviteExpiresAt ??
        u.onboardingTokenExpiry ??
        (u.invitedAt
          ? new Date(new Date(u.invitedAt).getTime() + 14 * 24 * 60 * 60 * 1000)
          : null);

      const isExpired = expiry
        ? new Date() > new Date(expiry) && !u.onboardingCompletedAt
        : false;

      return {
        userId: u.id,
        fullName: u.fullName,
        email: u.email,
        department: u.department?.name ?? null,
        jobTitle: u.jobTitle ?? null,
        invitedAt: u.invitedAt ?? u.createdAt,
        expiresAt: expiry,
        inviteOpenedAt: u.inviteOpenedAt ?? null,
        completedAt: u.onboardingCompletedAt ?? null,
        inviteStatus: computedStatus,
        onboardingLink: u.onboardingToken
          ? `${appUrl}/onboarding/${u.onboardingToken}`
          : null,
        isExpired,
      };
    });
  }

  /* ─── Generate new link for expired invite ─── */
  async regenerateLink(userId: string, orgId: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      include: { organization: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.onboardingCompletedAt) {
      throw new BadRequestException('User has already completed onboarding');
    }

    const newToken = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingToken: newToken,
        onboardingTokenExpiry: expiresAt,
        inviteExpiresAt: expiresAt,
        invitedAt: new Date(),
        inviteStatus: 'PENDING',
        invitationStatus: 'PENDING',
      },
    });

    const link = this.buildInviteUrl(newToken);

    await this.email
      .sendInviteEmail({
        to: user.email,
        employeeName: user.fullName,
        managerName: 'Your Manager',
        orgName: user.organization.name,
        inviteLink: link,
        jobTitle: user.jobTitle || undefined,
      })
      .catch((err) => console.error('Email resend failed:', err));

    return link;
  }

  /* ─── CSV export ─── */
  async exportInvitationsCsv(orgId: string): Promise<string> {
    const rows = await this.listInvitations(orgId);

    const header = [
      'Name',
      'Email',
      'Department',
      'Job Title',
      'Status',
      'Invited Date',
      'Expires',
      'Completed Date',
    ].join(',');

    const lines = rows.map((r) =>
      [
        `"${r.fullName}"`,
        r.email,
        `"${r.department ?? ''}"`,
        `"${r.jobTitle ?? ''}"`,
        r.inviteStatus,
        r.invitedAt ? new Date(r.invitedAt).toISOString().split('T')[0] : '',
        r.expiresAt ? new Date(r.expiresAt).toISOString().split('T')[0] : '',
        r.completedAt ? new Date(r.completedAt).toISOString().split('T')[0] : '',
      ].join(','),
    );

    return [header, ...lines].join('\n');
  }

  async getInviteLink(userId: string, orgId: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
    });
    if (!user?.onboardingToken)
      throw new NotFoundException('No active invite link');
    return this.buildInviteUrl(user.onboardingToken);
  }

  async markTokenOpened(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        onboardingToken: token,
        onboardingTokenExpiry: { gte: new Date() },
      },
    });
    if (!user) return null;

    const now = new Date();
    if (user.invitationStatus === 'PENDING' || user.inviteStatus === 'PENDING') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          inviteOpenedAt: now,
          inviteStatus: 'IN_PROGRESS',
          invitationStatus: 'IN_PROGRESS',
        },
      });
    }
    return user;
  }
}
