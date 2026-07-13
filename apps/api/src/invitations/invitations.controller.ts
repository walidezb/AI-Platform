import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { BulkInviteDto } from './dto/bulk-invite.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import * as Prisma from '@prisma/client';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  @Post('invite')
  @Roles('MANAGER', 'ORG_ADMIN')
  async invite(
    @Body() dto: InviteEmployeeDto,
    @CurrentUser() user: Prisma.User
  ) {
    const result = await this.service.inviteEmployee(dto, user.id, user.organizationId);
    return { success: true, data: result };
  }

  @Post('bulk')
  @Roles('MANAGER', 'ORG_ADMIN')
  async bulkInvite(
    @Body() dto: BulkInviteDto,
    @CurrentUser() user: Prisma.User
  ) {
    const result = await this.service.bulkInvite(dto.employees, user.id, user.organizationId);
    return { success: true, data: result };
  }

  @Get()
  @Roles('MANAGER', 'ORG_ADMIN')
  async list(@CurrentUser() user: Prisma.User) {
    return { success: true, data: await this.service.listInvitations(user.organizationId) };
  }

  @Get('validate/:token')
  @Public()
  async validate(@Param('token') token: string) {
    const result = await this.service.validateToken(token);
    return { success: true, data: result };
  }

  @Get(':userId/link')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getLink(
    @Param('userId') userId: string,
    @CurrentUser() user: Prisma.User
  ) {
    const link = await this.service.getInviteLink(userId, user.organizationId);
    return { success: true, data: { link } };
  }

  @Post(':userId/resend')
  @Roles('MANAGER', 'ORG_ADMIN')
  async resend(
    @Param('userId') userId: string,
    @CurrentUser() user: Prisma.User
  ) {
    const result = await this.service.resendInvite(userId, user.id, user.organizationId);
    return { success: true, data: result };
  }

  @Delete(':userId/revoke')
  @Roles('MANAGER', 'ORG_ADMIN')
  async revoke(
    @Param('userId') userId: string,
    @CurrentUser() user: Prisma.User
  ) {
    await this.service.revokeInvite(userId, user.id, user.organizationId);
    return { success: true, message: 'Invitation revoked' };
  }
}
