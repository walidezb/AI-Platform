import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsageService } from './usage.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';

@Controller()
export class UsageController {
  private readonly logger = new Logger(UsageController.name);

  constructor(
    private readonly service: UsageService,
    private readonly config: ConfigService,
  ) {}

  // Internal endpoint for FastAPI budget checks
  @Get('internal/budget/:orgId')
  @Public()
  @SkipThrottle()
  async getBudget(
    @Param('orgId') orgId: string,
    @Headers('x-internal-secret') secret: string,
  ) {
    const expectedSecret =
      this.config.get('INTERNAL_SERVICE_SECRET') ||
      this.config.get('AI_SERVICE_SECRET');
    if (secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid internal secret');
    }
    const result = await this.service.checkBudget(orgId);
    return { success: true, data: result };
  }

  // Internal endpoint called by AI service to log usage
  @Post('internal/usage/log')
  @Public()
  @SkipThrottle()
  async logUsage(
    @Body() body: any,
    @Headers('x-internal-secret') secret: string,
  ) {
    const expectedSecret =
      this.config.get('AI_SERVICE_SECRET') ||
      this.config.get('INTERNAL_SERVICE_SECRET');
    if (secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid internal secret');
    }
    await this.service.logUsage(body);
    return { success: true };
  }

  // Feature & employee spend breakdown for Phase 5 manager dashboard
  @Get('usage/org/:orgId/detail')
  @Roles(UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.PLATFORM_ADMIN)
  async getOrgUsageDetail(
    @Param('orgId') orgId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    // Org scope check
    if (
      user?.organizationId !== orgId &&
      user?.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have access to this organization usage data',
      );
    }

    const result = await this.service.getOrgUsageDetail(
      orgId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return { success: true, data: result };
  }

  // Manager/admin can view org usage summary
  @Get('usage/org')
  @Roles(UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.PLATFORM_ADMIN)
  async getOrgUsage(@CurrentUser() user: any, @Query('days') days?: string) {
    return {
      success: true,
      data: await this.service.getOrgUsage(
        user.organizationId,
        days ? parseInt(days) : 30,
      ),
    };
  }

  // Budget widget for settings page
  @Get('usage/budget')
  @Roles(UserRole.ORG_ADMIN, UserRole.MANAGER)
  async getBudgetWidget(@CurrentUser() user: any) {
    const usage = await this.service.getOrgUsage(user.organizationId, 30);
    return {
      success: true,
      data: {
        tokensUsed: usage.tokensUsed,
        tokensBudget: usage.tokensBudget,
        monthlyTokenBudgetUsd: usage.monthlyTokenBudgetUsd,
        budgetUsedPct: usage.budgetUsedPct,
        totalCostUsd: usage.totalCostUsd,
        byFeature: usage.byFeature,
      },
    };
  }
}
