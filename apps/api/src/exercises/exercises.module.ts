import { Module } from '@nestjs/common';
import { ExercisesController } from './exercises.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { QueuesModule } from '../queues/queues.module';
import { ProgressModule } from '../progress/progress.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [PrismaModule, QueuesModule, ProgressModule, UsageModule],
  controllers: [ExercisesController],
})
export class ExercisesModule {}
