import {
  Controller,
  Post,
  Get,
  Body,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { hashToken, generateUnsubscribeToken } from '../common/utils/token.utils';

import { AuthThrottle } from './throttle.config';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY || '',
});

interface SyncUserDto {
  clerkId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: ProgressService,
  ) {}

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

    // Sync role metadata to Clerk
    await clerkClient.users.updateUserMetadata(body.clerkId, {
      publicMetadata: {
        role: user.role,
      },
    });

    return {
      userId: user.id,
      role: user.role,
      organizationId: user.organizationId,
    };
  }

  @Public()
  @Post('sync-learner')
  async syncLearner(
    @Body() body: { token?: string; clerkId: string; email?: string; fullName?: string; avatarUrl?: string },
  ) {
    if (!body.clerkId) {
      throw new UnauthorizedException('Missing clerkId for sync');
    }

    // 1. Check if user already exists with this clerkId
    let user = await this.prisma.user.findFirst({
      where: { clerkId: body.clerkId },
    });

    if (user) {
      // Idempotent update
      return this.prisma.user.update({
        where: { id: user.id },
        data: {
          avatarUrl: body.avatarUrl || user.avatarUrl,
          fullName: body.fullName || user.fullName,
        },
      });
    }

    // 2. If token is provided, link to invited user
    if (body.token) {
      const tokenHash = hashToken(body.token);
      user = await this.prisma.user.findFirst({
        where: { onboardingToken: tokenHash },
      });

      if (user) {
        const updatedUser = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            clerkId: body.clerkId,
            avatarUrl: body.avatarUrl || null,
            invitationStatus: 'ACCEPTED',
            onboardingCompletedAt: new Date(),
          },
        });

        await clerkClient.users.updateUserMetadata(body.clerkId, {
          publicMetadata: {
            role: updatedUser.role,
          },
        }).catch((err) => this.logger.warn(`Failed to update Clerk metadata: ${err}`));

        return updatedUser;
      }
    }

    throw new NotFoundException('Invalid onboarding token or unsynced user');
  }

  @Get('me')
  getMe(@CurrentUser() user: any) {
    if (user && user.role === 'LEARNER') {
      // Fire-and-forget — don't block the auth response
      this.progressService
        .reconcileProgress(user.id)
        .catch((err) =>
          this.logger.warn(
            `Progress reconcile failed for ${user.id}: ${err}`,
          ),
        );
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        preferredLanguage: user.preferredLanguage,
        unsubscribeToken: user?.id ? generateUnsubscribeToken(user.id) : null,
        onboardingToken: user.onboardingToken,
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
      },
    };
  }
}
