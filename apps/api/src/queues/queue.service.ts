import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import * as Bull from 'bull';
import { QUEUE_NAMES, JOB_NAMES } from './queue.constants';
import {
  AssessmentCompletedPayload,
  PathGenerationPayload,
  ResourceCurationPayload,
  ExerciseGenerationPayload,
  NotificationPayload,
} from './queue.types';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.ASSESSMENT) private assessmentQueue: Bull.Queue,
    @InjectQueue(QUEUE_NAMES.PATH_GENERATION) private pathQueue: Bull.Queue,
    @InjectQueue(QUEUE_NAMES.RESOURCE_CURATION)
    private resourceQueue: Bull.Queue,
    @InjectQueue(QUEUE_NAMES.EXERCISE_GENERATION)
    private exerciseQueue: Bull.Queue,
    @InjectQueue(QUEUE_NAMES.EXERCISE_EVALUATION)
    private exerciseEvaluationQueue: Bull.Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private notificationQueue: Bull.Queue,
  ) {}

  // Called when AI service reports assessment complete
  async addAssessmentCompleted(payload: AssessmentCompletedPayload) {
    return this.assessmentQueue.add(
      JOB_NAMES.ASSESSMENT_COMPLETED,
      payload,
      { priority: 1 }, // high priority
    );
  }

  // Triggers full AI path generation
  async addPathGenerationJob(payload: PathGenerationPayload) {
    return this.pathQueue.add(JOB_NAMES.GENERATE_PATH, payload, {
      attempts: 2, // path gen is expensive, only retry once
      timeout: 300000, // 5 minute timeout
    });
  }

  // One job per module (runs in parallel after path is created)
  async addResourceCurationJob(payload: ResourceCurationPayload) {
    return this.resourceQueue.add(JOB_NAMES.CURATE_MODULE_RESOURCES, payload, {
      attempts: 3,
      timeout: 120000, // 2 minute timeout per module
    });
  }

  // One job per milestone
  async addExerciseGenerationJob(payload: ExerciseGenerationPayload) {
    return this.exerciseQueue.add(JOB_NAMES.GENERATE_EXERCISES, payload, {
      timeout: 60000,
    });
  }

  async addExerciseEvaluationJob(payload: {
    submissionId: string;
    exerciseId: string;
    userId: string;
    milestoneId: string;
  }) {
    return this.exerciseEvaluationQueue.add(payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s, 25s, 125s
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  // Notification jobs
  async addNotificationJob(payload: NotificationPayload) {
    return this.notificationQueue.add(
      `notification.${payload.type.toLowerCase()}`,
      payload,
      { attempts: 5 }, // emails should retry aggressively
    );
  }

  // Get queue health stats (used by admin dashboard)
  async getQueueStats() {
    const queues = [
      this.assessmentQueue,
      this.pathQueue,
      this.resourceQueue,
      this.exerciseQueue,
      this.exerciseEvaluationQueue,
      this.notificationQueue,
    ];
    return Promise.all(
      queues.map(async (q) => ({
        name: q.name,
        waiting: await q.getWaitingCount(),
        active: await q.getActiveCount(),
        completed: await q.getCompletedCount(),
        failed: await q.getFailedCount(),
        delayed: await q.getDelayedCount(),
      })),
    );
  }

  // Delegate direct additions for custom notification names
  async add(name: string, payload: any) {
    return this.notificationQueue.add(name, payload, { attempts: 5 });
  }
}
