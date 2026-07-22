import { Controller, Post, Body } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly service: UploadsService) {}

  @Post('org-logo/presign')
  @Roles(UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getLogoPresignedUrl(
    @Body()
    body: {
      fileExtension: string; // "png" | "jpg" | "webp" | "svg"
      contentType: string; // "image/png" etc.
    },
    @CurrentUser() user: any,
  ) {
    const result = await this.service.getLogoPresignedUrl(
      user.organizationId,
      body.fileExtension,
      body.contentType,
    );
    return { success: true, data: result };
  }
}
