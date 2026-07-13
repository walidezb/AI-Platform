import { Controller, Get } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { OrgId } from '../auth/decorators/org-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('manager')
export class ManagerController {
  constructor(private readonly service: ManagerService) {}

  @Get('activity')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getActivity(@OrgId() orgId: string) {
    return {
      success: true,
      data: await this.service.getRecentActivity(orgId),
    };
  }
}
