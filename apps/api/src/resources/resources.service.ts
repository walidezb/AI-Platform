import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResourceDto } from './dto/resource.dto';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async saveModuleResources(
    moduleId: string,
    resources: ResourceDto[],
  ) {
    // Verify module exists
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { id: true, milestoneId: true },
    });
    if (!module) throw new NotFoundException(`Module ${moduleId} not found`);

    // Delete existing resources for this module (replace strategy)
    await this.prisma.resource.deleteMany({ where: { moduleId } });

    // Bulk insert new resources
    const created = await this.prisma.resource.createMany({
      data: resources.map((r, i) => ({
        moduleId,
        title: r.title,
        url: r.url,
        sourcePlatform: r.sourcePlatform,
        description: r.description,
        resourceType: r.resourceType,
        thumbnailUrl: r.thumbnailUrl,
        durationMinutes: r.durationMinutes,
        qualityScore: r.qualityScore,
        language: r.language,
        sequenceOrder: r.sequenceOrder || i + 1,
      })),
    });

    return {
      moduleId,
      savedCount: created.count,
    };
  }

  async getModuleResources(moduleId: string) {
    return this.prisma.resource.findMany({
      where: { moduleId },
      orderBy: { sequenceOrder: 'asc' },
    });
  }

  async markResourceViewed(userId: string, resourceId: string) {
    // Creates or updates ResourceCompletion
    const existing = await this.prisma.resourceCompletion.findUnique({
      where: { userId_resourceId: { userId, resourceId } },
    });
    if (existing) return existing; // idempotent

    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      select: { moduleId: true },
    });
    if (!resource) throw new NotFoundException('Resource not found');

    return this.prisma.resourceCompletion.create({
      data: {
        userId,
        resourceId,
        moduleId: resource.moduleId,
      },
    });
  }
}
