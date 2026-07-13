import { 
  Injectable, 
  ConflictException, 
  NotFoundException, 
  BadRequestException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { User } from '@prisma/client';

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
    const appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000';
    return `${appUrl}/onboarding/${token}`;
  }

  async inviteEmployee(
    dto: InviteEmployeeDto,
    managerId: string,
    orgId: string
  ) {
    // Get manager info for email
    const manager = await this.prisma.user.findUnique({
      where: { id: managerId },
      include: { organization: true }
    });

    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    // Check if email already invited in this org
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, organizationId: orgId }
    });

    if (existing && existing.invitationStatus === 'ACCEPTED') {
      throw new ConflictException('This employee has already joined the platform');
    }

    const token = this.generateToken();
    const expiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    let user: User;
    if (existing) {
      // Re-invite: generate new token
      user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          onboardingToken: token,
          onboardingTokenExpiry: expiry,
          invitationStatus: 'PENDING',
          fullName: dto.fullName,
          departmentId: dto.departmentId || null,
          jobTitle: dto.jobTitle || null,
        }
      });
    } else {
      // New invite
      user = await this.prisma.user.create({
        data: {
          organizationId: orgId,
          email: dto.email,
          fullName: dto.fullName,
          clerkId: `pending_${token}`, // temp clerkId, updated on signup
          role: 'LEARNER',
          departmentId: dto.departmentId || null,
          jobTitle: dto.jobTitle || null,
          onboardingToken: token,
          onboardingTokenExpiry: expiry,
          invitationStatus: 'PENDING',
        }
      });
    }

    const inviteLink = this.buildInviteUrl(token);

    // Send email (don't await — fire and forget)
    this.email.sendInviteEmail({
      to: dto.email,
      employeeName: dto.fullName,
      managerName: manager.fullName,
      orgName: manager.organization.name,
      inviteLink,
      jobTitle: dto.jobTitle || undefined,
    }).catch(err => console.error('Email send failed:', err));

    return { userId: user.id, inviteLink, token };
  }

  async bulkInvite(
    employees: InviteEmployeeDto[],
    managerId: string,
    orgId: string
  ) {
    const results = await Promise.allSettled(
      employees.map(emp => this.inviteEmployee(emp, managerId, orgId))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { succeeded, failed, total: employees.length };
  }

  async validateToken(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        onboardingToken: token,
        onboardingTokenExpiry: { gte: new Date() },
      },
      include: {
        organization: { select: { name: true, logoUrl: true } },
        department: { select: { name: true } },
      }
    });

    if (!user) return { valid: false, reason: 'Token is invalid or has expired' };
    if (user.invitationStatus === 'REVOKED') {
      return { valid: false, reason: 'This invitation has been revoked' };
    }
    if (user.invitationStatus === 'ACCEPTED') {
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
    };
  }

  async revokeInvite(userId: string, managerId: string, orgId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId }
    });
    if (!user) throw new NotFoundException('Employee not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        invitationStatus: 'REVOKED',
        onboardingToken: null,
        onboardingTokenExpiry: null,
      }
    });
  }

  async resendInvite(userId: string, managerId: string, orgId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId }
    });
    if (!user) throw new NotFoundException('Employee not found');
    if (user.invitationStatus === 'ACCEPTED') {
      throw new BadRequestException('Employee has already accepted the invitation');
    }

    const dto: InviteEmployeeDto = {
      email: user.email,
      fullName: user.fullName,
      jobTitle: user.jobTitle || undefined,
      departmentId: user.departmentId || undefined,
    };
    return this.inviteEmployee(dto, managerId, orgId);
  }

  async listInvitations(orgId: string) {
    return this.prisma.user.findMany({
      where: { organizationId: orgId, role: 'LEARNER' },
      include: { department: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInviteLink(userId: string, orgId: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId }
    });
    if (!user?.onboardingToken) throw new NotFoundException('No active invite link');
    return this.buildInviteUrl(user.onboardingToken);
  }
}
