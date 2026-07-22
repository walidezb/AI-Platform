import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { ClerkGuard } from '../auth/clerk.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AlertsService } from './alerts.service';
import { UpdateAlertSettingsDto } from './dto/update-alert-settings.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('alerts')
@UseGuards(ClerkGuard, RolesGuard)
export class AlertsController {
  constructor(
    private readonly service: AlertsService,
    private readonly prisma: PrismaService,
  ) {}

  /* List stalled learners for org */
  @Get('stalled')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getStalled(@CurrentUser() user: User) {
    const data = await this.service.getStalledForOrg(user.organizationId);
    return { success: true, data };
  }

  /* Manually trigger nudge to one employee */
  @Post('nudge/:userId')
  @Roles('MANAGER', 'ORG_ADMIN')
  async nudgeEmployee(
    @Param('userId') userId: string,
    @CurrentUser() manager: User,
  ) {
    const employee = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: manager.organizationId,
      },
    });
    if (!employee) {
      throw new NotFoundException(
        'Employee not found in your organization',
      );
    }

    await this.service.sendLearnerNudge(userId, 'MANUAL');
    return {
      success: true,
      message: `Nudge email sent to ${employee.fullName}`,
    };
  }

  /* Get alert settings */
  @Get('settings')
  @Roles('ORG_ADMIN', 'MANAGER')
  async getSettings(@CurrentUser() user: User) {
    const data = await this.service.getSettings(user.organizationId);
    return { success: true, data };
  }

  /* Update alert settings */
  @Patch('settings')
  @Roles('ORG_ADMIN')
  async updateSettings(
    @CurrentUser() user: User,
    @Body() dto: UpdateAlertSettingsDto,
  ) {
    const data = await this.service.updateSettings(
      user.organizationId,
      dto,
    );
    return { success: true, data };
  }
}
