import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
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

  // Called by AI service
  @Post('internal/usage/log')
  @Public()
  @SkipThrottle()
  async logUsage(
    @Body() body: any,
    @Headers('x-internal-secret') secret: string,
  ) {
    if (secret !== this.config.get('AI_SERVICE_SECRET')) {
      throw new UnauthorizedException();
    }
    await this.service.logUsage(body);
    return { success: true };
  }

  // Manager/admin can view org usage
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
  async getBudget(@CurrentUser() user: any) {
    const usage = await this.service.getOrgUsage(user.organizationId, 30);
    return {
      success: true,
      data: {
        tokensUsed: usage.tokensUsed,
        tokensBudget: usage.tokensBudget,
        budgetUsedPct: usage.budgetUsedPct,
        totalCostUsd: usage.totalCostUsd,
        byFeature: usage.byFeature,
      },
    };
  }
}
