import { Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import { ClerkGuard } from '../auth/clerk.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('manager')
@UseGuards(ClerkGuard, RolesGuard)
export class ManagerController {
  constructor(private readonly service: ManagerService) {}

  @Get('team')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getTeamOverview(
    @CurrentUser() user: User,
    @Query('department') department?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.service.getTeamOverviewFiltered(
      user.organizationId,
      {
        department,
        role,
        status: status as any,
        search,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
      },
    );
    return { success: true, data };
  }

  @Get('team/trends')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getTeamTrends(@CurrentUser() user: User) {
    const data = await this.service.getTeamStatsWithTrend(user.organizationId);
    return { success: true, data };
  }

  @Get('team/stats')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getStatsTimeSeries(
    @CurrentUser() user: User,
    @Query('days') days?: string,
  ) {
    const data = await this.service.getStatsTimeSeries(
      user.organizationId,
      days ? parseInt(days, 10) : 30,
    );
    return { success: true, data };
  }

  @Get('team/export')
  @Roles('ORG_ADMIN', 'MANAGER')
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async exportTeam(@CurrentUser() user: User, @Res() res: any) {
    const csv = await this.service.exportTeamCsv(user.organizationId);
    const filename = `team-progress-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('analytics/completion-by-dept')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getCompletionByDept(@CurrentUser() user: User) {
    return {
      success: true,
      data: await this.service.getCompletionByDept(user.organizationId),
    };
  }

  @Get('analytics/top-performers')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getTopPerformers(@CurrentUser() user: User) {
    return {
      success: true,
      data: await this.service.getTopPerformers(user.organizationId),
    };
  }

  @Get('analytics/at-risk')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getAtRisk(
    @CurrentUser() user: User,
    @Query('department') department?: string,
  ) {
    return {
      success: true,
      data: await this.service.getAtRiskLearners(user.organizationId, department),
    };
  }

  @Get('analytics/skill-radar')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getSkillRadar(@CurrentUser() user: User) {
    return {
      success: true,
      data: await this.service.getSkillRadar(user.organizationId),
    };
  }

  @Get('analytics/velocity')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getLearningVelocity(@CurrentUser() user: User) {
    return {
      success: true,
      data: await this.service.getLearningVelocity(user.organizationId),
    };
  }

  @Post('alerts/nudge/:userId')
  @Roles('MANAGER', 'ORG_ADMIN')
  async sendNudgeAlert(@Param('userId') userId: string) {
    return await this.service.sendNudge(userId);
  }

  @Get('employees/:employeeId')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getEmployeeDetail(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.service.getEmployeeDetail(employeeId, user.id);
    return { success: true, data };
  }

  @Get('activity')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getActivity(@CurrentUser() user: User) {
    return {
      success: true,
      data: await this.service.getRecentActivity(user.organizationId),
    };
  }
}
