'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export type EmployeeDetailResponse = {
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    role: string;
    department: string | null;
    jobTitle: string | null;
    joinedAt: string;
  };
  assessment: {
    completedAt: string | null;
    experienceLevel: string | null;
    strongAreas: string[];
    weakAreas: string[];
    learningGoals: string[];
  } | null;
  path: {
    id: string;
    title: string;
    domain: string;
    totalMilestones: number;
    estimatedHours: number;
    status: string;
  } | null;
  progress: {
    completionPct: number;
    timeSpentHours: number;
    streakDays: number;
    lastActivityAt: string | null;
    status: string;
    currentMilestone: string | null;
  } | null;
  milestones: Array<{
    id: string;
    sequenceOrder: number;
    title: string;
    description: string | null;
    isLocked: boolean;
    completedAt: string | null;
    estimatedHours: number;
    modulesTotal: number;
    modulesCompleted: number;
    exercises: Array<{
      exerciseId: string;
      title: string;
      exerciseType: string;
      milestone: string;
      score: number | null;
      passed: boolean;
      attempts: number;
      submittedAt: string | null;
      status: string;
    }>;
  }>;
  activityByDay: Array<{
    date: string;
    minutes: number;
  }>;
  exerciseResults: Array<{
    exerciseId: string;
    title: string;
    exerciseType: string;
    milestone: string;
    score: number | null;
    passed: boolean;
    attempts: number;
    submittedAt: string | null;
    status: string;
  }>;
  recentActivity: Array<{
    date: string;
    action: string;
    detail: string;
    module: string | null;
    type: string;
  }>;
};

export function useEmployeeDetail(employeeId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['employee-detail', employeeId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: EmployeeDetailResponse }>(
        `/manager/employees/${employeeId}`,
      );
      return res.data;
    },
    enabled: !!employeeId,
    staleTime: 2 * 60_000,
  });
}
