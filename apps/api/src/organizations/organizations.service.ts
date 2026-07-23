import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { UpdateOrgDto } from './dto/update-org.dto';
import { slugify } from '../common/utils/slugify';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('0 2 * * *')
  async cleanOrphanedOrgs() {
    const orphans = await this.prisma.organization.findMany({
      where: {
        users: { none: {} },
        createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (orphans.length > 0) {
      this.logger.warn(`Deleting ${orphans.length} orphaned orgs`);
      await this.prisma.organization.deleteMany({
        where: { id: { in: orphans.map((o) => o.id) } },
      });
    }
  }

  async createOrganization(dto: CreateOrgDto) {
    const slug = dto.slug
      ? dto.slug
      : await this.generateUniqueSlug(dto.name);

    // Check slug is not taken
    const existing = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException(
        'This company URL is already taken. Please choose another.',
      );
    }

    // Use transaction to create org + first admin user atomically
    return this.prisma.$transaction(
      async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: dto.name,
            slug,
            industry: dto.industry,
            planTier: dto.planTier || 'STARTER',
          },
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
          },
        });

        return { org, user };
      },
      { timeout: 10000 },
    );
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let suffix = 1;
    while (
      await this.prisma.organization.findUnique({
        where: { slug },
      })
    ) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
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
          where: { organizationId: orgId, role: 'LEARNER' },
        }),
        this.prisma.userProgress.count({
          where: {
            learningPath: { organizationId: orgId },
            status: 'IN_PROGRESS',
          },
        }),
        this.prisma.userProgress.count({
          where: {
            learningPath: { organizationId: orgId },
            status: 'COMPLETED',
          },
        }),
        this.prisma.userProgress.count({
          where: {
            learningPath: { organizationId: orgId },
            status: 'NOT_STARTED',
          },
        }),
        this.prisma.learningPath.count({
          where: { organizationId: orgId },
        }),
      ]);

    const avgResult = await this.prisma.userProgress.aggregate({
      where: { learningPath: { organizationId: orgId } },
      _avg: { overallCompletionPct: true },
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

  async getOrgProfile(orgId: string) {
    return this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        industry: true,
        timezone: true,
        defaultLanguage: true,
        planTier: true,
        aiTokensBudget: true,
        aiTokensUsed: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { users: true } },
      },
    });
  }

  async updateOrgSettings(orgId: string, dto: UpdateOrgDto) {
    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name: dto.name,
        logoUrl: dto.logoUrl,
        industry: dto.industry,
        timezone: dto.timezone,
        defaultLanguage: dto.defaultLanguage,
      },
    });
  }

  async deleteOrganization(orgId: string, requestingUser: any) {
    if (
      requestingUser.role !== 'PLATFORM_ADMIN' &&
      requestingUser.organizationId !== orgId
    ) {
      throw new ForbiddenException('Cannot delete another organization');
    }
    if (
      requestingUser.role !== 'ORG_ADMIN' &&
      requestingUser.role !== 'PLATFORM_ADMIN'
    ) {
      throw new ForbiddenException(
        'Only Org Admins can delete the organization',
      );
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { slug: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        slug: `${org.slug}_deleted_${Date.now()}`,
      },
    });

    this.logger.warn(
      `Organization ${orgId} deleted by user ${requestingUser.id}`,
    );
  }

  async getPresignedUploadUrl(orgId: string, fileType: string) {
    return {
      uploadUrl: null,
      message: 'Logo upload via URL for MVP',
    };
  }
}
