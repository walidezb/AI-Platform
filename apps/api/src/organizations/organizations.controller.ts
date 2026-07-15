import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { UpdateOrgDto } from './dto/update-org.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrgId } from '../auth/decorators/org-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import * as Prisma from '@prisma/client';

@Controller('orgs')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  // Public endpoint — called during registration before user is in DB
  @Post()
  @Public()
  async create(@Body() dto: CreateOrgDto) {
    const { org, user } = await this.service.createOrganization(dto);
    return {
      success: true,
      data: { orgId: org.id, userId: user.id, slug: org.slug },
    };
  }

  @Get('slug-check/:slug')
  @Public()
  async checkSlug(@Param('slug') slug: string) {
    const available = await this.service.checkSlugAvailable(slug);
    return { available };
  }

  @Get(':id')
  @Roles('MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: Prisma.User,
    @OrgId() orgId: string,
  ) {
    // Ensure user belongs to this org, or is PLATFORM_ADMIN
    if (user.role !== 'PLATFORM_ADMIN' && orgId !== id) {
      throw new ForbiddenException();
    }
    return { success: true, data: await this.service.findById(id) };
  }

  @Get(':id/stats')
  @Roles('MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  async getStats(
    @Param('id') id: string,
    @CurrentUser() user: Prisma.User,
    @OrgId() orgId: string,
  ) {
    if (user.role !== 'PLATFORM_ADMIN' && orgId !== id) {
      throw new ForbiddenException();
    }
    return { success: true, data: await this.service.getStats(id) };
  }

  @Get(':id/profile')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getProfile(
    @Param('id') id: string,
    @CurrentUser() user: Prisma.User,
    @OrgId() orgId: string,
  ) {
    if (user.role !== 'PLATFORM_ADMIN' && orgId !== id) {
      throw new ForbiddenException();
    }
    return { success: true, data: await this.service.getOrgProfile(id) };
  }

  @Patch(':id')
  @Roles('ORG_ADMIN', 'PLATFORM_ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrgDto,
    @CurrentUser() user: Prisma.User,
    @OrgId() orgId: string,
  ) {
    if (user.role !== 'PLATFORM_ADMIN' && orgId !== id) {
      throw new ForbiddenException();
    }
    return {
      success: true,
      data: await this.service.updateOrgSettings(id, dto),
    };
  }
}
