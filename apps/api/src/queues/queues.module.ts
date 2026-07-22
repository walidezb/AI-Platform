import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from './queue.constants';
import { QueueService } from './queue.service';
import { AssessmentProcessor } from './processors/assessment.processor';
import { PathGenerationProcessor } from './processors/path-generation.processor';
import { ResourceCurationProcessor } from './processors/resource-curation.processor';
import { ExerciseGenerationProcessor } from './processors/exercise-generation.processor';
import { ExerciseEvaluationProcessor } from './processors/exercise-evaluation.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.ASSESSMENT },
      { name: QUEUE_NAMES.PATH_GENERATION },
      { name: QUEUE_NAMES.RESOURCE_CURATION },
      { name: QUEUE_NAMES.EXERCISE_GENERATION },
      { name: QUEUE_NAMES.EXERCISE_EVALUATION },
      { name: QUEUE_NAMES.NOTIFICATION },
    ),
    NotificationsModule,
  ],
  providers: [
    QueueService,
    AssessmentProcessor,
    PathGenerationProcessor,
    ResourceCurationProcessor,
    ExerciseGenerationProcessor,
    ExerciseEvaluationProcessor,
    NotificationProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueuesModule {}
