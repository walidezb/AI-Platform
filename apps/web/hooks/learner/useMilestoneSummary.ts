'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export interface MilestoneSummaryData {
  milestone: {
    id: string;
    title: string;
    description: string;
    sequenceOrder: number;
    completedAt?: string | null;
    estimatedHours: number;
    learningObjectives: string[];
  };
  stats: {
    totalResources: number;
    completedResources: number;
    timeSpentMinutes: number;
    exerciseResults: Array<{
      title: string;
      type: string;
      score: number | null;
      passed: boolean;
    }>;
    avgExerciseScore: number | null;
    moduleCount: number;
  };
  path: {
    id: string;
    title: string;
    totalMilestones: number;
    completedMilestones: number;
  };
  nextMilestone?: {
    id: string;
    title: string;
    sequenceOrder: number;
    isLocked: boolean;
  } | null;
  isPathComplete: boolean;
}

export function useMilestoneSummary(milestoneId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['milestone-summary', milestoneId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{
        success: boolean;
        data: MilestoneSummaryData;
      }>(`/progress/milestone/${milestoneId}/summary`);
      return res;
    },
    staleTime: 30_000,
    enabled: !!milestoneId,
    select: (res) => res.data,
  });
}
