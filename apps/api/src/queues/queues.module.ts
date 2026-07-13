import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from './queue.constants';
import { QueueService } from './queue.service';
import { AssessmentProcessor } from './processors/assessment.processor';
import { PathGenerationProcessor } from './processors/path-generation.processor';
import { ResourceCurationProcessor } from './processors/resource-curation.processor';
import { ExerciseGenerationProcessor } from './processors/exercise-generation.processor';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.ASSESSMENT },
      { name: QUEUE_NAMES.PATH_GENERATION },
      { name: QUEUE_NAMES.RESOURCE_CURATION },
      { name: QUEUE_NAMES.EXERCISE_GENERATION },
      { name: QUEUE_NAMES.NOTIFICATION },
    ),
  ],
  providers: [
    QueueService,
    AssessmentProcessor,
    PathGenerationProcessor,
    ResourceCurationProcessor,
    ExerciseGenerationProcessor,
    NotificationProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueuesModule {}
