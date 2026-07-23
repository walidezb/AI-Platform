'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export interface ResourceItem {
  id: string;
  title: string;
  url: string;
  resourceType: string;
  durationMinutes?: number | null;
  sourcePlatform: string;
  qualityScore: number;
}

export interface ExerciseItem {
  id: string;
  title: string;
  exerciseType: string;
  estimatedMinutes?: number;
  difficultyLevel?: string;
  passingScore?: number;
}

export interface EnrichedModule {
  id: string;
  title: string;
  description: string;
  moduleType: string;
  estimatedMinutes: number;
  isLocked: boolean;
  sequenceOrder: number;
  resources: ResourceItem[];
  completedResources: number;
  totalResources: number;
  completionPct: number;
  isComplete: boolean;
}

export interface EnrichedMilestone {
  id: string;
  sequenceOrder: number;
  title: string;
  description: string;
  learningObjectives: string[];
  estimatedHours: number;
  isLocked: boolean;
  completedAt?: string | null;
  modules: EnrichedModule[];
  exercises: ExerciseItem[];
  completedModules: number;
  totalModules: number;
  milestoneCompletionPct: number;
  allExercisesPassed: boolean;
}

export interface FullLearningPathData {
  id: string;
  title: string;
  description: string;
  domain: string;
  status: string;
  totalMilestones: number;
  estimatedHours: number;
  completedMilestones: number;
  overallCompletionPct: number;
  milestones: EnrichedMilestone[];
}

export function useLearningPath(pathId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['learning-path', pathId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: FullLearningPathData }>(`/paths/${pathId}`);
      return res;
    },
    staleTime: 30_000,
    refetchInterval: 10_000, // poll every 10s
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    enabled: !!pathId,
    select: (res) => res.data,
  });
}
