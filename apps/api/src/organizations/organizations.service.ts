import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { UpdateOrgDto } from './dto/update-org.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async createOrganization(dto: CreateOrgDto) {
    // Check slug is not taken
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug }
    });
    if (existing) {
      throw new ConflictException('This company URL is already taken. Please choose another.');
    }

    // Use transaction to create org + first admin user atomically
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          industry: dto.industry,
          planTier: dto.planTier || 'STARTER',
        }
      });

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          clerkId: dto.clerkId,
          email: dto.email,
          fullName: dto.fullName,
          role: 'ORG_ADMIN',
          invitationStatus: 'ACCEPTED',
          onboardingCompletedAt: new Date(),
        }
      });

      return { org, user };
    });
  }

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async findBySlug(slug: string) {
    return this.prisma.organization.findUnique({ where: { slug } });
  }

  async updateOrganization(id: string, dto: UpdateOrgDto) {
    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async getStats(orgId: string) {
    const [total, active, completed, notStarted, pathsGenerated] =
      await Promise.all([
        this.prisma.user.count({
          where: { organizationId: orgId, role: 'LEARNER' }
        }),
        this.prisma.userProgress.count({
          where: { learningPath: { organizationId: orgId }, status: 'IN_PROGRESS' }
        }),
        this.prisma.userProgress.count({
          where: { learningPath: { organizationId: orgId }, status: 'COMPLETED' }
        }),
        this.prisma.userProgress.count({
          where: { learningPath: { organizationId: orgId }, status: 'NOT_STARTED' }
        }),
        this.prisma.learningPath.count({
          where: { organizationId: orgId }
        }),
      ]);

    const avgResult = await this.prisma.userProgress.aggregate({
      where: { learningPath: { organizationId: orgId } },
      _avg: { overallCompletionPct: true }
    });

    return {
      totalEmployees: total,
      activeEmployees: active,
      completedEmployees: completed,
      notStartedEmployees: notStarted,
      pathsGenerated,
      avgCompletionPct: Math.round(avgResult._avg.overallCompletionPct || 0),
    };
  }

  async checkSlugAvailable(slug: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({ where: { slug } });
    return !org;
  }
}
