import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PathsService } from './paths.service';
import { QueueService } from '../queues/queue.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';

@Controller()
export class PathsController {
  private readonly logger = new Logger(PathsController.name);

  constructor(
    private readonly service: PathsService,
    private readonly config: ConfigService,
    private readonly queue: QueueService,
  ) {}

  @Post('internal/paths/save')
  @Public()
  @SkipThrottle()
  async savePath(
    @Body() body: any,
    @Headers('x-internal-secret') secret: string,
  ) {
    if (secret !== this.config.get('AI_SERVICE_SECRET')) {
      throw new UnauthorizedException();
    }

    try {
      const path = await this.service.savePath(body);

      // Queue notification job
      await this.queue.addNotificationJob({
        type: 'PATH_READY',
        userId: body.userId,
        organizationId: body.organizationId,
        data: { pathId: path.id, pathTitle: path.title },
      });

      return { success: true, pathId: path.id };
    } catch (error: any) {
      this.logger.error(`Path save failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to save learning path');
    }
  }

  // For frontend to retrieve user's learning path
  @Get('paths/my')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getMyPath(@CurrentUser() user: any) {
    const path = await this.service.getUserPath(user.id);
    return { success: true, data: path };
  }

  @Get('paths/:id')
  @Roles(UserRole.LEARNER, UserRole.MANAGER, UserRole.ORG_ADMIN)
  async getPath(@Param('id') id: string, @CurrentUser() user: any) {
    const path = await this.service.getPathById(id, user);
    return { success: true, data: path };
  }
}
