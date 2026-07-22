import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { AlertsController } from '../alerts/alerts.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ManagerController, AlertsController],
  providers: [ManagerService],
  exports: [ManagerService],
})
export class ManagerModule {}
