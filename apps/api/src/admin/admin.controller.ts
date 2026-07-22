import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ClerkGuard } from '../auth/clerk.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('admin')
@UseGuards(ClerkGuard, RolesGuard)
@Roles('PLATFORM_ADMIN') // ALL admin routes: PLATFORM_ADMIN only
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('stats')
  async getPlatformStats() {
    const [stats, newOrgs, dailyCost] = await Promise.all([
      this.service.getPlatformStats(),
      this.service.getNewOrgsTimeSeries(),
      this.service.getDailyCostTimeSeries(),
    ]);
    return { success: true, data: { stats, newOrgs, dailyCost } };
  }

  @Get('orgs')
  async getAllOrgs(
    @Query('search') search?: string,
    @Query('planTier') planTier?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.service.getAllOrgs({
      search,
      planTier,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return { success: true, data };
  }

  @Get('orgs/:orgId')
  async getOrgDetails(@Param('orgId') orgId: string) {
    const data = await this.service.getOrgDetails(orgId);
    return { success: true, data };
  }

  @Patch('orgs/:orgId')
  async updateOrg(
    @Param('orgId') orgId: string,
    @Body() body: { planTier?: string; aiTokensBudget?: number },
  ) {
    if (body.aiTokensBudget !== undefined) {
      await this.service.updateOrgBudget(orgId, body.aiTokensBudget);
    }
    if (body.planTier) {
      await this.service.updateOrgPlan(orgId, body.planTier);
    }
    return { success: true, message: 'Organization updated' };
  }

  @Post('orgs/:orgId/suspend')
  async suspendOrg(
    @Param('orgId') orgId: string,
    @Body() body: { reason: string },
  ) {
    if (!body.reason?.trim()) {
      throw new BadRequestException('Suspension reason is required');
    }
    await this.service.suspendOrg(orgId, body.reason);
    return { success: true, message: 'Organization suspended' };
  }

  @Post('orgs/:orgId/reactivate')
  async reactivateOrg(@Param('orgId') orgId: string) {
    await this.service.reactivateOrg(orgId);
    return { success: true, message: 'Organization reactivated' };
  }

  @Post('orgs/:orgId/impersonate')
  async impersonateOrg(
    @Param('orgId') orgId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.service.impersonateOrg(orgId, user.id);
    return { success: true, data };
  }

  @Get('orgs/:orgId/invoices')
  async getOrgInvoices(@Param('orgId') orgId: string) {
    const data = await this.service.getOrgInvoices(orgId);
    return { success: true, data };
  }

  @Get('ai-costs')
  async getAiCosts() {
    const data = await this.service.getDailyCostTimeSeries();
    return { success: true, data };
  }
}
