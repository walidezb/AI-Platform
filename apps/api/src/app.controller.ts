import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import * as Bull from 'bull';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { QUEUE_NAMES } from './queues/queue.constants';
import { QueueService } from './queues/queue.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectQueue(QUEUE_NAMES.ASSESSMENT) private assessmentQueue: Bull.Queue,
    private readonly queueService: QueueService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  async getHealth() {
    const redisOk = await this.checkRedis();
    return {
      status: redisOk ? 'ok' : 'degraded',
      timestamp: new Date(),
      services: {
        api: 'ok',
        redis: redisOk ? 'ok' : 'error',
      },
    };
  }

  private async checkRedis(): Promise<boolean> {
    try {
      await this.assessmentQueue.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}
