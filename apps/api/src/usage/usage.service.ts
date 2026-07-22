import {
  Injectable,
  Logger,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BudgetAlertType } from '@prisma/client';

export interface UsageDashboardDto {
  currentPeriod: {
    start: Date;
    end: Date;
    tokensUsed: number;
    costUsd: number;
    budget: number;
    percentUsed: number;
    planTier: string;
    subStatus: string;
  };
  nextInvoiceEstimate: {
    amount: number;
    dueDate: Date;
  };
  byFeature: Array<{
    feature: string;
    tokensUsed: number;
    costUsd: number;
    callCount: number;
  }>;
  byEmployee: Array<{
    userId: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    tokensUsed: number;
    costUsd: number;
    topFeature: string;
  }>;
  dailyUsage: Array<{
    date: string;
    tokensUsed: number;
    costUsd: number;
  }>;
}

export interface BudgetStatus {
  organizationId: string;
  used: number; // total costUsd or tokens used
  budget: number; // org.aiTokensBudget
  percentUsed: number; // (used / budget) * 100
  isOverBudget: boolean; // used >= budget
  isNearLimit: boolean; // percentUsed >= 80
  remainingUsd: number; // budget - used
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly notifs: NotificationsService,
  ) {}

  /* ─── checkAndEnforceBudget ─── */
  async checkAndEnforceBudget(orgId: string): Promise<BudgetStatus> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        aiTokensBudget: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        status: true,
      },
    });
    if (!org) throw new NotFoundException('Organization not found');

    // Org suspended → block all AI
    if (org.status === 'SUSPENDED') {
      throw new HttpException(
        'Organization is suspended. Contact support.',
        HttpStatus.PAYMENT_REQUIRED, // 402
      );
    }

    const budget = Number(org.aiTokensBudget ?? 1_000_000);
    const periodStart =
      org.currentPeriodStart ??
      new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodEnd =
      org.currentPeriodEnd ??
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    // Sum tokens used this period
    const usage = await this.prisma.aiUsageLog.aggregate({
      where: {
        organizationId: orgId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { tokensUsed: true, tokensInput: true, tokensOutput: true },
    });

    const tokensUsed =
      usage._sum.tokensUsed ??
      (usage._sum.tokensInput ?? 0) + (usage._sum.tokensOutput ?? 0);
    const percentUsed =
      budget > 0 ? Math.round((tokensUsed / budget) * 100) : 0;
    const remainingTokens = Math.max(budget - tokensUsed, 0);
    const isWarning = percentUsed >= 80 && percentUsed < 100;
    const isExceeded = percentUsed >= 100;
    const isCritical = percentUsed >= 120;

    // ── Deduped alerts: send each alert type ONCE per billing period ──
    if (isWarning || isExceeded || isCritical) {
      const alertType: BudgetAlertType = isCritical
        ? 'EXCEEDED_120'
        : isExceeded
        ? 'EXCEEDED_100'
        : 'WARNING_80';

      const alreadySent = await this.prisma.budgetAlert.findUnique({
        where: {
          organizationId_type_periodStart: {
            organizationId: orgId,
            type: alertType,
            periodStart,
          },
        },
      });

      if (!alreadySent) {
        // Schedule alert asynchronously — don't block the response
        this.sendBudgetAlert(orgId, alertType, {
          percentUsed,
          tokensUsed,
          budget,
          periodStart,
          periodEnd,
        }).catch((err) =>
          this.logger.error(`Budget alert failed for org ${orgId}: ${err}`),
        );

        // Record that we sent this alert to prevent duplicates
        await this.prisma.budgetAlert
          .create({
            data: {
              organizationId: orgId,
              type: alertType,
              periodStart,
            },
          })
          .catch(() => {}); // ignore race-condition duplicate errors
      }
    }

    // ── Hard block at 100% ──
    if (isExceeded) {
      const appUrl =
        this.config.get<string>('APP_URL') || 'http://localhost:3000';
      throw new HttpException(
        {
          statusCode: 402,
          error: 'Budget Exceeded',
          message: 'AI token budget exceeded for this billing period.',
          percentUsed,
          tokensUsed,
          budget,
          remainingTokens: 0,
          upgradeUrl: `${appUrl}/manage/billing`,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return {
      organizationId: orgId,
      used: tokensUsed,
      budget,
      percentUsed,
      isOverBudget: false,
      isNearLimit: isWarning,
      remainingUsd: remainingTokens,
    };
  }

  /* ─── sendBudgetAlert ─── */
  private async sendBudgetAlert(
    orgId: string,
    type: BudgetAlertType,
    data: {
      percentUsed: number;
      tokensUsed: number;
      budget: number;
      periodStart: Date;
      periodEnd: Date;
    },
  ): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: { in: ['ORG_ADMIN', 'MANAGER'] },
      },
      select: { id: true, fullName: true, email: true },
    });

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    const appUrl =
      this.config.get<string>('APP_URL') || 'http://localhost:3000';

    for (const admin of admins) {
      // In-app notification
      await this.notifs.create({
        userId: admin.id,
        type:
          type === 'WARNING_80'
            ? 'BUDGET_WARNING'
            : type === 'EXCEEDED_100'
            ? 'BUDGET_EXCEEDED'
            : 'BUDGET_CRITICAL',
        title:
          type === 'WARNING_80'
            ? `⚠️ AI budget ${data.percentUsed}% used`
            : `🚨 AI budget exceeded — AI paused`,
        message:
          type === 'WARNING_80'
            ? `You've used ${data.percentUsed}% of your monthly AI token budget.`
            : `Your AI budget is exhausted. New AI operations are paused until you upgrade.`,
        data: { percentUsed: data.percentUsed, upgradeUrl: '/manage/billing' },
      });

      // Email
      if (type === 'WARNING_80') {
        await this.email.sendBudgetWarning80({
          to: admin.email,
          adminName: admin.fullName,
          orgName: org?.name ?? 'Your organization',
          percentUsed: data.percentUsed,
          tokensUsed: data.tokensUsed,
          budget: data.budget,
          periodEnd: data.periodEnd,
          upgradeUrl: `${appUrl}/manage/billing`,
          usageUrl: `${appUrl}/manage/billing`,
        });
      } else {
        await this.email.sendBudgetExceeded100({
          to: admin.email,
          adminName: admin.fullName,
          orgName: org?.name ?? 'Your organization',
          percentUsed: data.percentUsed,
          tokensUsed: data.tokensUsed,
          budget: data.budget,
          periodEnd: data.periodEnd,
          upgradeUrl: `${appUrl}/manage/billing`,
        });
      }
    }

    this.logger.warn(
      `Budget alert [${type}] sent for org ${orgId} (${data.percentUsed}% used)`,
    );
  }

  async logUsage(data: {
    organizationId: string;
    userId: string;
    feature: string;
    modelUsed: string;
    tokensInput: number;
    tokensOutput: number;
    costUsd: number;
  }) {
    const totalTokens = data.tokensInput + data.tokensOutput;

    // Create log entry
    await this.prisma.aiUsageLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        feature: data.feature as any,
        modelUsed: data.modelUsed,
        tokensInput: data.tokensInput,
        tokensOutput: data.tokensOutput,
        costUsd: data.costUsd,
      },
    });

    // Update org running total
    await this.prisma.organization.update({
      where: { id: data.organizationId },
      data: {
        aiTokensUsed: { increment: BigInt(totalTokens) },
      },
    });

    // Check budget threshold
    await this.checkBudget(data.organizationId);
  }

  async checkBudget(orgId: string): Promise<BudgetStatus> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { monthlyTokenBudgetUsd: true, name: true },
    });

    const budget = org?.monthlyTokenBudgetUsd ?? null;

    if (budget === null || budget === undefined) {
      return {
        organizationId: orgId,
        used: 0,
        budget: 0,
        percentUsed: 0,
        isOverBudget: false,
        isNearLimit: false,
        remainingUsd: 0,
      };
    }

    // Calculate total costUsd in current billing month (start of current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const aggregate = await this.prisma.aiUsageLog.aggregate({
      where: {
        organizationId: orgId,
        createdAt: { gte: startOfMonth },
      },
      _sum: { costUsd: true },
    });

    const used = Number(aggregate._sum.costUsd || 0);
    const percentUsed = budget > 0 ? (used / budget) * 100 : 0;
    const isOverBudget = used >= budget;
    const isNearLimit = percentUsed >= 80;
    const remainingUsd = Math.max(0, budget - used);

    if (isOverBudget) {
      this.logger.warn(
        `🚨 Org ${orgId} has EXCEEDED AI budget ($${used.toFixed(2)} / $${budget.toFixed(2)})`,
      );
    } else if (isNearLimit) {
      this.logger.warn(
        `⚠️ Org ${orgId} at ${percentUsed.toFixed(1)}% of AI budget ($${used.toFixed(2)} / $${budget.toFixed(2)})`,
      );
    }

    return {
      organizationId: orgId,
      used,
      budget,
      percentUsed,
      isOverBudget,
      isNearLimit,
      remainingUsd,
    };
  }

  async getOrgUsageDetail(
    orgId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    byFeature: Array<{
      feature: string;
      callCount: number;
      tokensInput: number;
      tokensOutput: number;
      totalTokens: number;
      costUsd: number;
      pctOfTotal: number;
    }>;
    byEmployee: Array<{
      userId: string;
      fullName: string;
      email: string;
      avatarUrl: string | null;
      jobTitle: string | null;
      callCount: number;
      totalTokens: number;
      costUsd: number;
      pctOfTotal: number;
    }>;
    byDay: Array<{
      date: string;
      costUsd: number;
      tokensUsed: number;
      calls: number;
    }>;
    totals: {
      totalCostUsd: number;
      totalTokens: number;
      totalCalls: number;
      uniqueUsers: number;
    };
  }> {
    const where: any = {
      organizationId: orgId,
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    };

    const [byFeatureRaw, byUserRaw, allLogs] = await Promise.all([
      // Group by feature
      this.prisma.aiUsageLog.groupBy({
        by: ['feature'],
        where,
        _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
        _count: { id: true },
        orderBy: { _sum: { costUsd: 'desc' } },
      }),

      // Group by user
      this.prisma.aiUsageLog.groupBy({
        by: ['userId'],
        where,
        _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
        _count: { id: true },
        orderBy: { _sum: { costUsd: 'desc' } },
        take: 20, // top 20 consumers
      }),

      // All logs for daily breakdown
      this.prisma.aiUsageLog.findMany({
        where,
        select: {
          createdAt: true,
          costUsd: true,
          tokensInput: true,
          tokensOutput: true,
          feature: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Enrich user data with names
    const userIds = byUserRaw.map((r) => r.userId);
    const userNames = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        jobTitle: true,
      },
    });
    const userMap = new Map(userNames.map((u) => [u.id, u]));

    // Build daily breakdown
    const dailyMap: Record<
      string,
      { date: string; costUsd: number; tokensUsed: number; calls: number }
    > = {};

    for (const log of allLogs) {
      const date = log.createdAt.toISOString().split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { date, costUsd: 0, tokensUsed: 0, calls: 0 };
      }
      dailyMap[date].costUsd += Number(log.costUsd || 0);
      dailyMap[date].tokensUsed += log.tokensInput + log.tokensOutput;
      dailyMap[date].calls += 1;
    }

    const totalCostUsd = allLogs.reduce(
      (s, l) => s + Number(l.costUsd || 0),
      0,
    );
    const totals = {
      totalCostUsd,
      totalTokens: allLogs.reduce(
        (s, l) => s + l.tokensInput + l.tokensOutput,
        0,
      ),
      totalCalls: allLogs.length,
      uniqueUsers: new Set(byUserRaw.map((r) => r.userId)).size,
    };

    return {
      byFeature: byFeatureRaw.map((r) => {
        const costUsd = Number(r._sum.costUsd ?? 0);
        return {
          feature: r.feature,
          callCount: r._count.id,
          tokensInput: r._sum.tokensInput ?? 0,
          tokensOutput: r._sum.tokensOutput ?? 0,
          totalTokens: (r._sum.tokensInput ?? 0) + (r._sum.tokensOutput ?? 0),
          costUsd,
          pctOfTotal:
            totals.totalCostUsd > 0 ? (costUsd / totals.totalCostUsd) * 100 : 0,
        };
      }),

      byEmployee: byUserRaw.map((r) => {
        const user = userMap.get(r.userId);
        const costUsd = Number(r._sum.costUsd ?? 0);
        return {
          userId: r.userId,
          fullName: user?.fullName ?? 'Unknown',
          email: user?.email ?? '',
          avatarUrl: user?.avatarUrl ?? null,
          jobTitle: user?.jobTitle ?? null,
          callCount: r._count.id,
          totalTokens: (r._sum.tokensInput ?? 0) + (r._sum.tokensOutput ?? 0),
          costUsd,
          pctOfTotal:
            totals.totalCostUsd > 0 ? (costUsd / totals.totalCostUsd) * 100 : 0,
        };
      }),

      byDay: Object.values(dailyMap),
      totals,
    };
  }

  async getOrgUsage(orgId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [logs, totals] = await Promise.all([
      this.prisma.aiUsageLog.groupBy({
        by: ['feature'],
        where: { organizationId: orgId, createdAt: { gte: since } },
        _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
        _count: true,
      }),
      this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { aiTokensUsed: true, aiTokensBudget: true, monthlyTokenBudgetUsd: true },
      }),
    ]);

    const totalCost = logs.reduce(
      (sum, l) => sum + Number(l._sum.costUsd || 0),
      0,
    );

    return {
      byFeature: logs.map((l) => ({
        feature: l.feature,
        calls: l._count,
        inputTokens: l._sum.tokensInput || 0,
        outputTokens: l._sum.tokensOutput || 0,
        costUsd: Number(l._sum.costUsd || 0).toFixed(4),
      })),
      totalCostUsd: totalCost.toFixed(4),
      tokensUsed: Number(totals?.aiTokensUsed || 0),
      tokensBudget: Number(totals?.aiTokensBudget || 0),
      monthlyTokenBudgetUsd: totals?.monthlyTokenBudgetUsd ?? 50.0,
      budgetUsedPct: totals
        ? Math.round(
            (Number(totals.aiTokensUsed) / Number(totals.aiTokensBudget)) * 100,
          )
        : 0,
    };
  }

  async getUserUsage(userId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prisma.aiUsageLog.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      select: {
        feature: true,
        modelUsed: true,
        tokensInput: true,
        tokensOutput: true,
        costUsd: true,
        createdAt: true,
      },
      take: 100,
    });
  }

  async getOrgUsageDashboard(orgId: string): Promise<UsageDashboardDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        aiTokensBudget: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        planTier: true,
      },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const periodStart =
      org.currentPeriodStart ??
      new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodEnd =
      org.currentPeriodEnd ??
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const logs = await this.prisma.aiUsageLog.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: {
        feature: true,
        tokensUsed: true,
        tokensInput: true,
        tokensOutput: true,
        costUsd: true,
        userId: true,
        createdAt: true,
      },
    });

    const tokensUsed = logs.reduce(
      (s, l) => s + (l.tokensUsed || (l.tokensInput + l.tokensOutput) || 0),
      0,
    );
    const costUsd = logs.reduce((s, l) => s + Number(l.costUsd || 0), 0);
    const budget = Number(org.aiTokensBudget ?? 1_000_000);
    const percentUsed =
      budget > 0 ? Math.min(Math.round((tokensUsed / budget) * 100), 999) : 0;

    const featureMap: Record<
      string,
      { tokensUsed: number; costUsd: number; callCount: number }
    > = {};

    for (const log of logs) {
      const f = log.feature ?? 'unknown';
      if (!featureMap[f]) {
        featureMap[f] = { tokensUsed: 0, costUsd: 0, callCount: 0 };
      }
      const t = log.tokensUsed || (log.tokensInput + log.tokensOutput) || 0;
      featureMap[f].tokensUsed += t;
      featureMap[f].costUsd += Number(log.costUsd || 0);
      featureMap[f].callCount += 1;
    }

    const byFeature = Object.entries(featureMap)
      .map(([feature, data]) => ({
        feature,
        tokensUsed: data.tokensUsed,
        costUsd: Math.round(data.costUsd * 100) / 100,
        callCount: data.callCount,
      }))
      .sort((a, b) => b.tokensUsed - a.tokensUsed);

    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, email: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const employeeMap: Record<
      string,
      {
        tokensUsed: number;
        costUsd: number;
      }
    > = {};

    const employeeFeatures: Record<string, Record<string, number>> = {};

    for (const log of logs) {
      if (!log.userId) continue;
      const uid = log.userId;
      if (!employeeMap[uid]) {
        employeeMap[uid] = { tokensUsed: 0, costUsd: 0 };
      }
      const t = log.tokensUsed || (log.tokensInput + log.tokensOutput) || 0;
      employeeMap[uid].tokensUsed += t;
      employeeMap[uid].costUsd += Number(log.costUsd || 0);

      if (log.feature) {
        if (!employeeFeatures[uid]) employeeFeatures[uid] = {};
        employeeFeatures[uid][log.feature] =
          (employeeFeatures[uid][log.feature] ?? 0) + 1;
      }
    }

    const byEmployee = Object.entries(employeeMap)
      .map(([userId, data]) => {
        const featureCounts = employeeFeatures[userId] ?? {};
        const topFeature =
          Object.entries(featureCounts).sort(
            ([, a], [, b]) => b - a,
          )[0]?.[0] ?? 'unknown';
        const user = userMap.get(userId);
        return {
          userId,
          fullName: user?.fullName ?? 'Unknown',
          email: user?.email ?? '',
          avatarUrl: user?.avatarUrl ?? null,
          tokensUsed: data.tokensUsed,
          costUsd: Math.round(data.costUsd * 100) / 100,
          topFeature,
        };
      })
      .sort((a, b) => b.tokensUsed - a.tokensUsed)
      .slice(0, 10);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyLogs = await this.prisma.aiUsageLog.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        tokensUsed: true,
        tokensInput: true,
        tokensOutput: true,
        costUsd: true,
      },
    });

    const dailyMap: Record<
      string,
      { tokensUsed: number; costUsd: number }
    > = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { tokensUsed: 0, costUsd: 0 };
    }

    for (const log of dailyLogs) {
      const key = log.createdAt.toISOString().split('T')[0];
      if (dailyMap[key]) {
        const t = log.tokensUsed || (log.tokensInput + log.tokensOutput) || 0;
        dailyMap[key].tokensUsed += t;
        dailyMap[key].costUsd += Number(log.costUsd || 0);
      }
    }

    const dailyUsage = Object.entries(dailyMap).map(([date, data]) => ({
      date,
      tokensUsed: data.tokensUsed,
      costUsd: Math.round(data.costUsd * 100) / 100,
    }));

    const daysInPeriod = Math.max(
      1,
      Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    const daysElapsed = Math.max(
      1,
      Math.ceil(
        (Date.now() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    const projectedCost =
      daysElapsed > 0
        ? Math.round((costUsd / daysElapsed) * daysInPeriod * 100) / 100
        : 0;

    return {
      currentPeriod: {
        start: periodStart,
        end: periodEnd,
        tokensUsed,
        costUsd: Math.round(costUsd * 100) / 100,
        budget,
        percentUsed,
        planTier: org.planTier ?? 'starter',
        subStatus: org.subscriptionStatus ?? 'trialing',
      },
      nextInvoiceEstimate: {
        amount: projectedCost,
        dueDate: periodEnd,
      },
      byFeature,
      byEmployee,
      dailyUsage,
    };
  }
}
