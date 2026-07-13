import { Controller, Post, Get, Body, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

import { AuthThrottle } from './throttle.config';

interface SyncUserDto {
  clerkId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @AuthThrottle()
  @Post('sync')
  async syncUser(@Body() body: SyncUserDto) {
    if (!body.clerkId || !body.email || !body.fullName) {
      throw new UnauthorizedException('Missing required fields for sync');
    }

    let user = await this.prisma.user.findUnique({
      where: { clerkId: body.clerkId },
    });

    if (!user) {
      // First user creates their workspace organization
      const orgName = `${body.fullName}'s Workspace`;
      const orgSlug = `${body.fullName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')}-${Date.now().toString().slice(-4)}`;

      const organization = await this.prisma.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
          planTier: 'STARTER',
        },
      });

      user = await this.prisma.user.create({
        data: {
          clerkId: body.clerkId,
          email: body.email,
          fullName: body.fullName,
          avatarUrl: body.avatarUrl || null,
          role: 'ORG_ADMIN',
          organizationId: organization.id,
        },
      });
    }

    return {
      userId: user.id,
      role: user.role,
      organizationId: user.organizationId,
    };
  }

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        preferredLanguage: user.preferredLanguage,
        organization: user.organization
          ? {
              id: user.organization.id,
              name: user.organization.name,
              slug: user.organization.slug,
              logoUrl: user.organization.logoUrl,
              planTier: user.organization.planTier,
              defaultLanguage: user.organization.defaultLanguage,
              aiTokensBudget: Number(user.organization.aiTokensBudget || 0),
              aiTokensUsed: Number(user.organization.aiTokensUsed || 0),
            }
          : null,
        department: user.department
          ? {
              id: user.department.id,
              name: user.department.name,
            }
          : null,
      }
    };
  }
}
