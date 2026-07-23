import { Module } from '@nestjs/common';
import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';
import { AssessmentCleanupService } from './assessment-cleanup.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueuesModule } from '../queues/queues.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [PrismaModule, QueuesModule, UsageModule],
  controllers: [AssessmentController],
  providers: [AssessmentService, AssessmentCleanupService],
  exports: [AssessmentService, AssessmentCleanupService],
})
export class AssessmentModule {}
