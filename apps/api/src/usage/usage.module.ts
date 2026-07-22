import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { UsageEventsListener } from './usage-events.listener';
import { UsageInterceptor } from './usage.interceptor';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, EmailModule, NotificationsModule],
  controllers: [UsageController],
  providers: [UsageService, UsageEventsListener, UsageInterceptor],
  exports: [UsageService, UsageInterceptor],
})
export class UsageModule {}
