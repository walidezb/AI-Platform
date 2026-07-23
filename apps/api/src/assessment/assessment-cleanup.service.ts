import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssessmentCleanupService {
  private readonly logger = new Logger(AssessmentCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Run every day at 3:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanStaleAssessments(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const result = await this.prisma.assessment.updateMany({
      where: {
        status: 'IN_PROGRESS',
        updatedAt: { lt: cutoff },
      },
      data: { status: 'ABANDONED' },
    });

    if (result.count > 0) {
      this.logger.warn(
        `[AssessmentCleanup] Marked ${result.count} stale IN_PROGRESS ` +
          `assessments as ABANDONED (older than 24h)`,
      );
    } else {
      this.logger.debug('[AssessmentCleanup] No stale assessments found');
    }
  }

  // Manual trigger for admin use
  async runCleanupNow(): Promise<{ count: number }> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.prisma.assessment.updateMany({
      where: { status: 'IN_PROGRESS', updatedAt: { lt: cutoff } },
      data: { status: 'ABANDONED' },
    });
    return { count: result.count };
  }
}
