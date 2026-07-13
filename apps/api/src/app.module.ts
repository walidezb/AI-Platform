import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClerkGuard } from './auth/clerk.guard';
import { RolesGuard } from './auth/roles.guard';
import { QueuesModule } from './queues/queues.module';
import { LoggerModule } from './logger/logger.module';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { OrganizationsModule } from './organizations/organizations.module';
import { ManagerModule } from './manager/manager.module';
import { InvitationsModule } from './invitations/invitations.module';
import { DepartmentsModule } from './departments/departments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        const isProd = process.env.NODE_ENV === 'production';
        return {
          redis: {
            url: redisUrl,
            tls: isProd ? {} : undefined,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: 100,
            removeOnFail: 200,
          },
        };
      },
      inject: [ConfigService],
    }),
    QueuesModule,
    LoggerModule,
    OrganizationsModule,
    ManagerModule,
    InvitationsModule,
    DepartmentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ClerkGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
