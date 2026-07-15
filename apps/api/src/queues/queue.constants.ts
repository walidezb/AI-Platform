export const QUEUE_NAMES = {
  ASSESSMENT: 'assessment-queue',
  PATH_GENERATION: 'path-generation-queue',
  RESOURCE_CURATION: 'resource-curation-queue',
  EXERCISE_GENERATION: 'exercise-generation-queue',
  NOTIFICATION: 'notification-queue',
} as const;

export const JOB_NAMES = {
  ASSESSMENT_COMPLETED: 'assessment.completed',
  GENERATE_PATH: 'path.generate',
  CURATE_MODULE_RESOURCES: 'resources.curate',
  GENERATE_EXERCISES: 'exercises.generate',
  SEND_PATH_READY: 'notification.path_ready',
  SEND_MILESTONE_COMPLETE: 'notification.milestone_complete',
  SEND_STALLED_ALERT: 'notification.stalled_alert',
  SEND_BUDGET_WARNING: 'notification.budget_warning',
} as const;
