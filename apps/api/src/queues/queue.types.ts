export interface AssessmentCompletedPayload {
  assessmentId: string;
  userId: string;
  organizationId: string;
  skillProfile: Record<string, unknown>;
}

export interface PathGenerationPayload {
  assessmentId: string;
  userId: string;
  organizationId: string;
  skillProfile: Record<string, unknown>;
  roleRequirements?: {
    title: string;
    focusAreas: string[];
  };
}

export interface ResourceCurationPayload {
  moduleId: string;
  milestoneId: string;
  pathId: string;
  moduleTitle: string;
  objectives: string[];
  level: string;
  domain: string;
  language: string;
  organizationId: string;
  userId: string;
}

export interface ExerciseGenerationPayload {
  milestoneId: string;
  milestoneTitle: string;
  objectives: string[];
  domain: string;
  level: string;
  organizationId: string;
  userId: string;
}

export interface NotificationPayload {
  type:
    'PATH_READY' | 'MILESTONE_COMPLETE' | 'STALLED_ALERT' | 'BUDGET_WARNING';
  userId: string;
  organizationId: string;
  data: Record<string, unknown>;
}
