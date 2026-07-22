import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly service: ProgressService) {}

  @Post('resource/complete')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async markResourceComplete(
    @Body() body: { resourceId: string; timeSpentSeconds?: number },
    @CurrentUser() user: any,
  ) {
    if (!body?.resourceId) {
      throw new BadRequestException('resourceId is required');
    }

    const result = await this.service.markResourceComplete(
      user.id,
      body.resourceId,
      body.timeSpentSeconds ?? 0,
    );

    return { success: true, data: result };
  }

  @Get('me')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getMyProgress(@CurrentUser() user: any) {
    const result = await this.service.getUserProgressSummary(user.id);
    return { success: true, data: result };
  }

  @Get('module/:moduleId')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getModuleProgress(
    @Param('moduleId') moduleId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.service.getModuleProgress(user.id, moduleId);
    return { success: true, data: result };
  }

  @Get('milestone/:milestoneId')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getMilestoneProgress(
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.service.checkMilestoneProgress(
      user.id,
      milestoneId,
    );
    return { success: true, data: result };
  }

  @Get('milestone/:milestoneId/summary')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getMilestoneSummary(
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.service.getMilestoneSummary(
      user.id,
      milestoneId,
    );
    return { success: true, data: result };
  }

  @Get('summary')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getProgressSummary(@CurrentUser() user: any) {
    const result = await this.service.getProgressSummary(user.id);
    return { success: true, data: result };
  }
}
