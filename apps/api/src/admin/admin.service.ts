import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService, InvoiceSummary } from '../billing/billing.service';
import { Prisma, OrgStatus } from '@prisma/client';

export interface ImpersonationToken {
  token: string;
  expiresIn: number;
  targetUser: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
  orgName: string;
  impersonateUrl: string;
}

export interface PlatformStats {
  totalOrgs: number;
  activeOrgs: number;
  totalLearners: number;
  totalPaths: number;
  aiSpendToday: number;
  aiSpendThisMonth: number;
  dau: number;
  newOrgsThisMonth: number;
}

export interface MonthlyPoint {
  month: string;
  value: number;
}

export interface DailyCostPoint {
  date: string;
  costUsd: number;
  tokensUsed: number;
}

export interface OrgRow {
  id: string;
  name: string;
  email: string | null;
  logoUrl: string | null;
  planTier: string;
  status: OrgStatus;
  subscriptionStatus: string;
  aiTokensBudget: number;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  createdAt: Date;
  totalEmployees: number;
  totalPaths: number;
  aiCostThisMonth: number;
  tokensThisMonth: number;
}

export interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  logoUrl: string | null;
  planTier: string | null;
  status: OrgStatus;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  aiTokensBudget: any;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  createdAt: Date;
  users: Array<any>;
  learningPaths: Array<any>;
  alertSettings: any;
  monthlyUsage: {
    costUsd: number;
    tokensUsed: number;
  };
  allTimeUsage: {
    costUsd: number;
    tokensUsed: number;
  };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly billingService: BillingService,
  ) {}

  /* ── Platform-wide stats ── */
  async getPlatformStats(): Promise<PlatformStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstOfCurrentMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );

    const [
      totalOrgs,
      totalUsers,
      totalPaths,
      todayTokens,
      thisMonthCost,
      activeOrgs,
      newOrgsThisMonth,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count({ where: { role: 'LEARNER' } }),
      this.prisma.learningPath.count(),
      this.prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { tokensUsed: true, tokensInput: true, tokensOutput: true },
      }),
      this.prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: firstOfCurrentMonth } },
        _sum: { costUsd: true },
      }),
      this.prisma.organization.count({
        where: { status: OrgStatus.ACTIVE },
      }),
      this.prisma.organization.count({
        where: {
          createdAt: { gte: firstOfCurrentMonth },
        },
      }),
    ]);

    // DAU: distinct users who completed any resource today
    const dauResult = await this.prisma.resourceCompletion.findMany({
      where: { completedAt: { gte: today } },
      select: { userId: true },
      distinct: ['userId'],
    });

    const sumTodayTokens =
      todayTokens._sum.tokensUsed ??
      (todayTokens._sum.tokensInput ?? 0) + (todayTokens._sum.tokensOutput ?? 0);

    return {
      totalOrgs,
      activeOrgs,
      totalLearners: totalUsers,
      totalPaths,
      aiSpendToday:
        Math.round((sumTodayTokens / 1000) * 0.01 * 100) / 100,
      aiSpendThisMonth:
        Math.round(Number(thisMonthCost._sum.costUsd ?? 0) * 100) / 100,
      dau: dauResult.length,
      newOrgsThisMonth,
    };
  }

  /* ── New orgs per month (last 6 months) ── */
  async getNewOrgsTimeSeries(): Promise<MonthlyPoint[]> {
    const months: MonthlyPoint[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const count = await this.prisma.organization.count({
        where: { createdAt: { gte: start, lte: end } },
      });

      months.push({
        month: d.toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
        value: count,
      });
    }
    return months;
  }

  /* ── Daily AI cost (last 30 days, all orgs) ── */
  async getDailyCostTimeSeries(): Promise<DailyCostPoint[]> {
    const result: DailyCostPoint[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        0,
        0,
        0,
      );
      const end = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        23,
        59,
        59,
      );

      const agg = await this.prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: start, lte: end } },
        _sum: { costUsd: true, tokensUsed: true, tokensInput: true, tokensOutput: true },
      });

      const totalTokens =
        agg._sum.tokensUsed ??
        (agg._sum.tokensInput ?? 0) + (agg._sum.tokensOutput ?? 0);

      result.push({
        date: start.toISOString().split('T')[0],
        costUsd: Math.round(Number(agg._sum.costUsd ?? 0) * 100) / 100,
        tokensUsed: totalTokens,
      });
    }
    return result;
  }

  /* ── List all orgs (paginated + filtered) ── */
  async getAllOrgs(params: {
    search?: string;
    planTier?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orgs: OrgRow[]; total: number }> {
    const { search, planTier, status, page = 1, limit = 20 } = params;

    const where: Prisma.OrganizationWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(planTier && { planTier: { equals: planTier, mode: 'insensitive' } }),
      ...(status && { status: status as OrgStatus }),
    };

    const [total, orgs] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          planTier: true,
          status: true,
          subscriptionStatus: true,
          aiTokensBudget: true,
          suspendedAt: true,
          suspendedReason: true,
          createdAt: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          users: {
            where: { role: 'ORG_ADMIN' },
            select: { email: true },
            take: 1,
          },
          _count: {
            select: {
              users: true,
              learningPaths: true,
            },
          },
        },
      }),
    ]);

    // Enrich with AI cost this month
    const orgIds = orgs.map((o) => o.id);
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const costByOrg = await this.prisma.aiUsageLog.groupBy({
      by: ['organizationId'],
      where: {
        organizationId: { in: orgIds },
        createdAt: { gte: thisMonth },
      },
      _sum: { costUsd: true, tokensUsed: true, tokensInput: true, tokensOutput: true },
    });
    const costMap = new Map(costByOrg.map((c) => [c.organizationId, c._sum]));

    return {
      total,
      orgs: orgs.map((o) => {
        const usage = costMap.get(o.id);
        const tokens =
          usage?.tokensUsed ??
          (usage?.tokensInput ?? 0) + (usage?.tokensOutput ?? 0);
        return {
          id: o.id,
          name: o.name,
          email: o.users[0]?.email ?? null,
          logoUrl: o.logoUrl,
          planTier: o.planTier ?? 'starter',
          status: o.status,
          subscriptionStatus: o.subscriptionStatus ?? 'trialing',
          aiTokensBudget: Number(o.aiTokensBudget ?? 1_000_000),
          suspendedAt: o.suspendedAt,
          suspendedReason: o.suspendedReason,
          createdAt: o.createdAt,
          totalEmployees: o._count.users,
          totalPaths: o._count.learningPaths,
          aiCostThisMonth:
            Math.round(Number(usage?.costUsd ?? 0) * 100) / 100,
          tokensThisMonth: tokens,
        };
      }),
    };
  }

  /* ── Full org details ── */
  async getOrgDetails(orgId: string): Promise<OrgDetails> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        users: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            department: true,
            createdAt: true,
            progress: {
              select: {
                status: true,
                overallCompletionPct: true,
                lastActivityAt: true,
              },
            },
          },
        },
        learningPaths: {
          select: {
            id: true,
            title: true,
            domain: true,
            status: true,
            createdAt: true,
            _count: { select: { milestones: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        alertSettings: true,
      },
    });
    if (!org) throw new NotFoundException('Organization not found');

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const orgAny = org as any;

    // Usage: current month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [monthlyUsage, allTimeUsage] = await Promise.all([
      this.prisma.aiUsageLog.aggregate({
        where: { organizationId: orgId, createdAt: { gte: thisMonth } },
        _sum: { costUsd: true, tokensUsed: true, tokensInput: true, tokensOutput: true },
      }),
      this.prisma.aiUsageLog.aggregate({
        where: { organizationId: orgId },
        _sum: { costUsd: true, tokensUsed: true, tokensInput: true, tokensOutput: true },
      }),
    ]);

    const adminUser = orgAny.users?.find((u: any) => u.role === 'ORG_ADMIN') || orgAny.users?.[0];

    const monthlyTokens =
      monthlyUsage._sum.tokensUsed ??
      (monthlyUsage._sum.tokensInput ?? 0) + (monthlyUsage._sum.tokensOutput ?? 0);

    const allTimeTokens =
      allTimeUsage._sum.tokensUsed ??
      (allTimeUsage._sum.tokensInput ?? 0) + (allTimeUsage._sum.tokensOutput ?? 0);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      email: adminUser?.email ?? null,
      logoUrl: org.logoUrl,
      planTier: org.planTier,
      status: org.status,
      subscriptionStatus: org.subscriptionStatus,
      stripeCustomerId: org.stripeCustomerId,
      aiTokensBudget: Number(org.aiTokensBudget ?? 1_000_000),
      suspendedAt: org.suspendedAt,
      suspendedReason: org.suspendedReason,
      createdAt: org.createdAt,
      users: orgAny.users || [],
      learningPaths: orgAny.learningPaths || [],
      alertSettings: orgAny.alertSettings || null,
      monthlyUsage: {
        costUsd:
          Math.round(Number(monthlyUsage._sum.costUsd ?? 0) * 100) / 100,
        tokensUsed: monthlyTokens,
      },
      allTimeUsage: {
        costUsd:
          Math.round(Number(allTimeUsage._sum.costUsd ?? 0) * 100) / 100,
        tokensUsed: allTimeTokens,
      },
    };
  }

  /* ── Suspend org ── */
  async suspendOrg(orgId: string, reason: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        status: OrgStatus.SUSPENDED,
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedReason: reason,
      },
    });
    this.logger.warn(`Org ${orgId} SUSPENDED. Reason: ${reason}`);
  }

  /* ── Reactivate org ── */
  async reactivateOrg(orgId: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        status: OrgStatus.ACTIVE,
        isSuspended: false,
        suspendedAt: null,
        suspendedReason: null,
      },
    });
    this.logger.log(`Org ${orgId} REACTIVATED`);
  }

  /* ── Update org budget ── */
  async updateOrgBudget(orgId: string, newBudget: number): Promise<void> {
    if (newBudget < 10_000) {
      throw new BadRequestException('Budget must be at least 10,000 tokens');
    }
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { aiTokensBudget: BigInt(newBudget) },
    });
    this.logger.log(
      `Org ${orgId} budget updated to ${newBudget.toLocaleString()} tokens`,
    );
  }

  /* ── Update org plan ── */
  async updateOrgPlan(orgId: string, planTier: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { planTier },
    });
  }

  /* ── Impersonate org: generate short-lived scoped token ── */
  async impersonateOrg(
    orgId: string,
    adminUserId: string,
  ): Promise<ImpersonationToken> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, status: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    // Find a representative ORG_ADMIN or MANAGER in that org to impersonate
    const targetUser = await this.prisma.user.findFirst({
      where: {
        organizationId: orgId,
        role: { in: ['ORG_ADMIN', 'MANAGER'] },
      },
      select: { id: true, email: true, fullName: true, role: true },
    });
    if (!targetUser) {
      throw new BadRequestException(
        'No ORG_ADMIN or MANAGER found in this organization',
      );
    }

    // Sign a short-lived JWT (1 hour max, non-renewable)
    const payload = {
      sub: targetUser.id,
      organizationId: orgId,
      role: targetUser.role,
      impersonating: true,
      impersonatedBy: adminUserId,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: '1h',
      secret:
        this.config.get<string>('JWT_SECRET') || 'ezlearn-impersonation-secret',
    });

    // Audit log — always record impersonation attempts
    this.logger.warn(
      `[IMPERSONATION] Admin ${adminUserId} impersonating ` +
        `org ${orgId} (${org.name}) as user ${targetUser.id} ` +
        `(${targetUser.email})`,
    );

    // Also write to DB audit trail
    await this.prisma.adminAuditLog
      .create({
        data: {
          action: 'IMPERSONATE_ORG',
          performedBy: adminUserId,
          targetOrgId: orgId,
          targetUserId: targetUser.id,
          metadata: JSON.stringify({
            orgName: org.name,
            targetEmail: targetUser.email,
            targetRole: targetUser.role,
          }),
        },
      })
      .catch(() => {});

    const appUrl =
      this.config.get<string>('APP_URL') || 'http://localhost:3000';

    return {
      token,
      expiresIn: 3600,
      targetUser,
      orgName: org.name,
      impersonateUrl: `${appUrl}/impersonate?token=${token}`,
    };
  }

  /* ── Fetch org Stripe invoices ── */
  async getOrgInvoices(orgId: string): Promise<InvoiceSummary[]> {
    return this.billingService.getInvoices(orgId);
  }
}
