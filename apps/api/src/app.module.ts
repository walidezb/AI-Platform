import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClerkGuard } from './auth/clerk.guard';
import { RolesGuard } from './auth/roles.guard';
import { OrgScopeInterceptor } from './auth/org-scope.interceptor';
import { QueuesModule } from './queues/queues.module';
import { LoggerModule } from './logger/logger.module';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { AuditMiddleware } from './middleware/audit.middleware';
import { OrganizationsModule } from './organizations/organizations.module';
import { ManagerModule } from './manager/manager.module';
import { InvitationsModule } from './invitations/invitations.module';
import { DepartmentsModule } from './departments/departments.module';
import { AssessmentModule } from './assessment/assessment.module';
import { PathsModule } from './paths/paths.module';
import { UsageModule } from './usage/usage.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';

import { InternalController } from './internal/internal.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'global',
            ttl: 60000, // 1 minute window
            limit: 100, // 100 requests per minute per IP
          },
        ],
        storage: new ThrottlerStorageRedisService(config.get('REDIS_URL')),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl =
          configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
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
    AssessmentModule,
    PathsModule,
    UsageModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [AppController, InternalController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ClerkGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: OrgScopeInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware, AuditMiddleware).forRoutes('*');
  }
}
