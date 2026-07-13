import { Controller, Get } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import * as Prisma from '@prisma/client';

@Controller('manager')
export class ManagerController {
  constructor(private readonly service: ManagerService) {}

  @Get('activity')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getActivity(@CurrentUser() user: Prisma.User) {
    return {
      success: true,
      data: await this.service.getRecentActivity(user.organizationId),
    };
  }
}
