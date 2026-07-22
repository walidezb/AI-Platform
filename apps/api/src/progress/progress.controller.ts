import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { User } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly service: ProgressService) {}

  @Post('resource/complete')
  @Roles('LEARNER', 'MANAGER', 'ORG_ADMIN')
  async markResourceComplete(
    @Body() body: { resourceId: string; timeSpentSeconds?: number },
    @CurrentUser() user: any,
  ) {
    const result = await this.service.markResourceComplete(
      user.id,
      body.resourceId,
      body.timeSpentSeconds,
    );
    return { success: true, data: result };
  }

  @Get('module/:moduleId')
  @Roles('LEARNER', 'MANAGER', 'ORG_ADMIN')
  async getModuleProgress(
    @Param('moduleId') moduleId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.service.getModuleProgress(user.id, moduleId);
    return { success: true, data: result };
  }

  @Get('me')
  @Roles('LEARNER', 'MANAGER', 'ORG_ADMIN')
  async getMyProgress(@CurrentUser() user: any) {
    const result = await this.service.getUserProgressSummary(user.id);
    return { success: true, data: result };
  }
}
