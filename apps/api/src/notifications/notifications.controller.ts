import { Controller, Get, Patch, Query, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getNotifications(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    const notifications = await this.service.getUserNotifications(
      user.id,
      limit ? parseInt(limit, 10) : 20,
    );
    return { success: true, data: notifications };
  }

  @Get('unread-count')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.service.getUnreadCount(user.id);
    return { success: true, data: { count } };
  }

  @Patch(':id/read')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async markRead(@Param('id') id: string, @CurrentUser() user: any) {
    await this.service.markAsRead(id, user.id);
    return { success: true };
  }

  @Patch('mark-all-read')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async markAllRead(@CurrentUser() user: any) {
    await this.service.markAllAsRead(user.id);
    return { success: true };
  }
}
