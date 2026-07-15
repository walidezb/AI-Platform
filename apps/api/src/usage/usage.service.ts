import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

    // Update org running total (using BigInt since DB schema is BIGINT)
    await this.prisma.organization.update({
      where: { id: data.organizationId },
      data: {
        aiTokensUsed: { increment: BigInt(totalTokens) },
      },
    });

    // Check budget threshold
    await this.checkBudget(data.organizationId);
  }

  async checkBudget(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { aiTokensUsed: true, aiTokensBudget: true, name: true },
    });
    if (!org) return;

    const usedBigInt = BigInt(org.aiTokensUsed);
    const budgetBigInt = BigInt(org.aiTokensBudget);

    if (budgetBigInt === 0n) return;
    const pct = Number((usedBigInt * 100n) / budgetBigInt);

    if (pct >= 100) {
      this.logger.warn(`🚨 Org ${orgId} has exceeded AI budget (${pct}%)`);
    } else if (pct >= 80) {
      this.logger.warn(`⚠️ Org ${orgId} at ${pct}% of AI budget`);
    }
  }

  async getOrgUsage(orgId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [logs, totals] = await Promise.all([
      // Daily breakdown
      this.prisma.aiUsageLog.groupBy({
        by: ['feature'],
        where: { organizationId: orgId, createdAt: { gte: since } },
        _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
        _count: true,
      }),
      // Overall
      this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { aiTokensUsed: true, aiTokensBudget: true },
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
