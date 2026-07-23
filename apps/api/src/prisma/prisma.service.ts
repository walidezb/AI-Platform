import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config?: ConfigService) {
    const isDev = (config?.get('NODE_ENV') ?? process.env.NODE_ENV) === 'development';
    super({
      log: isDev
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'development') {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      (this as any).$on('query', (e: any) => {
        if (e.duration > 100) {
          this.logger.warn(`[SLOW QUERY] ${e.duration}ms:\n${e.query}`);
        }
      });
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
