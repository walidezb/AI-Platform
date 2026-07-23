import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  HttpCode,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { verifyUnsubscribeToken } from '../common/utils/token.utils';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

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

  @Get('unsubscribe')
  @Public()
  @HttpCode(200)
  async unsubscribe(
    @Query('token') token: string,
    @Query('userId') userId: string,
  ) {
    if (!token || !userId) {
      throw new BadRequestException('Missing token or userId');
    }

    const isValid = verifyUnsubscribeToken(userId, token);
    if (!isValid) {
      throw new ForbiddenException('Invalid unsubscribe token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailNotifications: false },
    });

    return {
      success: true,
      message: 'You have been unsubscribed from email notifications.',
    };
  }

  @Post('resubscribe')
  @HttpCode(200)
  async resubscribe(@CurrentUser() user: any) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailNotifications: true },
    });
    return { success: true };
  }
}
