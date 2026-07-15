import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ManagerService {
  constructor(private prisma: PrismaService) {}

  async getRecentActivity(orgId: string, limit = 8) {
    // Query completions joined with user info
    const completions = await this.prisma.completion.findMany({
      where: { user: { organizationId: orgId } },
      include: {
        user: { select: { fullName: true, avatarUrl: true, id: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });

    // Query recently joined users
    const newUsers = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: 'LEARNER',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    // Merge and sort by date
    const activities = [
      ...completions.map((c) => ({
        id: c.id,
        employeeName: c.user.fullName,
        avatarUrl: c.user.avatarUrl,
        action:
          c.entityType === 'MILESTONE'
            ? 'completed milestone'
            : 'completed module',
        type: c.passed ? 'completed' : 'in-progress',
        createdAt: c.completedAt,
      })),
      ...newUsers.map((u) => ({
        id: u.id,
        employeeName: u.fullName,
        avatarUrl: u.avatarUrl,
        action: 'joined the platform',
        type: 'active',
        createdAt: u.createdAt,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);

    return activities;
  }
}
