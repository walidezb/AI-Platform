import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { InvitationsService } from './invitations.service';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { BulkInviteDto } from './dto/bulk-invite.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrgId } from '../auth/decorators/org-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AuthThrottle } from '../auth/throttle.config';
import * as Prisma from '@prisma/client';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  @AuthThrottle()
  @Post('invite')
  @Roles('MANAGER', 'ORG_ADMIN')
  async invite(
    @Body() dto: InviteEmployeeDto,
    @CurrentUser() user: Prisma.User,
    @OrgId() orgId: string,
  ) {
    const result = await this.service.inviteEmployee(dto, user.id, orgId);
    return { success: true, data: result };
  }

  @AuthThrottle()
  @Post('bulk')
  @Roles('MANAGER', 'ORG_ADMIN')
  async bulkInvite(
    @Body() dto: BulkInviteDto,
    @CurrentUser() user: Prisma.User,
    @OrgId() orgId: string,
  ) {
    const result = await this.service.bulkInvite(dto.employees, user.id, orgId);
    return { success: true, data: result };
  }

  @Get('stats')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getStats(@OrgId() orgId: string) {
    return {
      success: true,
      data: await this.service.getInviteStats(orgId),
    };
  }

  @Get('export')
  @Roles('MANAGER', 'ORG_ADMIN')
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async exportCsv(@OrgId() orgId: string, @Res() res: any) {
    const csv = await this.service.exportInvitationsCsv(orgId);
    const filename = `invitations-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Post('bulk-revoke')
  @Roles('MANAGER', 'ORG_ADMIN')
  async bulkRevoke(
    @Body() body: { userIds: string[] },
    @CurrentUser() user: Prisma.User,
    @OrgId() orgId: string,
  ) {
    await Promise.all(
      body.userIds.map((id) =>
        this.service.revokeInvite(id, user.id, orgId),
      ),
    );
    return {
      success: true,
      message: `${body.userIds.length} invites revoked`,
    };
  }

  @Get()
  @Roles('MANAGER', 'ORG_ADMIN')
  async list(@OrgId() orgId: string) {
    return { success: true, data: await this.service.listInvitations(orgId) };
  }

  @Get('validate/:token')
  @Public()
  async validate(@Param('token') token: string) {
    const result = await this.service.validateToken(token);
    return { success: true, data: result };
  }

  @Post('validate/:token/open')
  @Public()
  async markOpened(@Param('token') token: string) {
    const user = await this.service.markTokenOpened(token);
    if (!user) return { success: false };
    return { success: true };
  }

  @Get(':userId/link')
  @Roles('MANAGER', 'ORG_ADMIN')
  async getLink(@Param('userId') userId: string, @OrgId() orgId: string) {
    const link = await this.service.getInviteLink(userId, orgId);
    return { success: true, data: { link } };
  }

  @Post(':userId/regenerate-link')
  @Roles('MANAGER', 'ORG_ADMIN')
  async regenerateLink(
    @Param('userId') userId: string,
    @OrgId() orgId: string,
  ) {
    const link = await this.service.regenerateLink(userId, orgId);
    return { success: true, data: { link } };
  }

  @Post(':userId/resend')
  @Roles('MANAGER', 'ORG_ADMIN')
  async resend(
    @Param('userId') userId: string,
    @CurrentUser() user: Prisma.User,
    @OrgId() orgId: string,
  ) {
    const result = await this.service.resendInvite(userId, user.id, orgId);
    return { success: true, data: result };
  }

  @Delete(':userId/revoke')
  @Roles('MANAGER', 'ORG_ADMIN')
  async revoke(
    @Param('userId') userId: string,
    @CurrentUser() user: Prisma.User,
    @OrgId() orgId: string,
  ) {
    await this.service.revokeInvite(userId, user.id, orgId);
    return { success: true, message: 'Invitation revoked' };
  }
}
