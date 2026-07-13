'use client';

import { usePostHog } from 'posthog-js/react';
import { useUser } from '@clerk/nextjs';

export function useAnalytics() {
  const posthog = usePostHog();
  const { user } = useUser();

  const identify = (userId: string, properties?: Record<string, unknown>) => {
    posthog.identify(userId, {
      email: user?.primaryEmailAddress?.emailAddress,
      name: user?.fullName,
      ...properties,
    });
  };

  const track = (event: string, properties?: Record<string, unknown>) => {
    posthog.capture(event, {
      userId: user?.id,
      ...properties,
    });
  };

  return {
    identify,
    // Onboarding events
    trackAssessmentStarted: (assessmentId: string) =>
      track('assessment_started', { assessmentId }),
    trackAssessmentCompleted: (assessmentId: string, durationSeconds: number) =>
      track('assessment_completed', { assessmentId, durationSeconds }),
    // Learning events
    trackPathViewed: (pathId: string, pathTitle: string) =>
      track('path_viewed', { pathId, pathTitle }),
    trackModuleStarted: (moduleId: string, moduleTitle: string) =>
      track('module_started', { moduleId, moduleTitle }),
    trackModuleCompleted: (moduleId: string, timeSpentMinutes: number) =>
      track('module_completed', { moduleId, timeSpentMinutes }),
    trackMilestoneCompleted: (milestoneId: string, milestoneTitle: string) =>
      track('milestone_completed', { milestoneId, milestoneTitle }),
    trackExerciseSubmitted: (exerciseId: string, score: number, passed: boolean) =>
      track('exercise_submitted', { exerciseId, score, passed }),
    trackResourceCompleted: (resourceId: string, resourceType: string) =>
      track('resource_completed', { resourceId, resourceType }),
    // Manager events
    trackEmployeeInvited: (count: number) =>
      track('employee_invited', { count }),
    trackDashboardViewed: () =>
      track('manager_dashboard_viewed'),
  };
}
