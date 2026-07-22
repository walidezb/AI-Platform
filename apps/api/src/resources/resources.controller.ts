import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { User } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ResourcesService } from './resources.service';
import { SaveModuleResourcesDto } from './dto/resource.dto';

@Controller()
export class ResourcesController {
  private readonly logger = new Logger(ResourcesController.name);

  constructor(
    private service: ResourcesService,
    private config: ConfigService,
  ) {}

  // ── INTERNAL: called by AI service after curation ──────
  @Post('internal/modules/:moduleId/resources')
  @Public()
  @SkipThrottle()
  async saveModuleResources(
    @Param('moduleId') moduleId: string,
    @Body() dto: SaveModuleResourcesDto,
    @Headers('x-internal-secret') secret: string,
  ) {
    const expectedSecret =
      this.config.get('INTERNAL_SERVICE_SECRET') ||
      this.config.get('AI_SERVICE_SECRET');

    if (!secret || secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid internal secret');
    }

    this.logger.log(
      `Saving ${dto.resources.length} resources for module ${moduleId}`,
    );

    const result = await this.service.saveModuleResources(
      moduleId,
      dto.resources,
    );

    return { success: true, ...result };
  }

  // ── PUBLIC: learner fetches module resources ────────────
  @Get('modules/:moduleId/resources')
  @Roles('LEARNER', 'MANAGER', 'ORG_ADMIN')
  async getModuleResources(@Param('moduleId') moduleId: string) {
    const resources = await this.service.getModuleResources(moduleId);
    return { success: true, data: resources };
  }

  // ── PUBLIC: mark a resource as viewed ──────────────────
  @Post('progress/resource/complete')
  @Roles('LEARNER', 'MANAGER', 'ORG_ADMIN')
  async markResourceComplete(
    @Body('resourceId') resourceId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.service.markResourceViewed(user.id, resourceId);
    return { success: true, data: result };
  }
}
