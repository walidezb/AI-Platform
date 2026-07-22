import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BudgetStatus {
  organizationId: string;
  used: number; // total costUsd this billing period
  budget: number; // org.monthlyTokenBudgetUsd
  percentUsed: number; // (used / budget) * 100
  isOverBudget: boolean; // used >= budget
  isNearLimit: boolean; // percentUsed >= 80
  remainingUsd: number; // budget - used
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}
