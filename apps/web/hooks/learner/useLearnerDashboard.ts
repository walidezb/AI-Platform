import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/hooks/useApiClient';

export interface Module {
  id: string;
  sequenceOrder: number;
  title: string;
  description: string;
  moduleType: 'READING' | 'VIDEO' | 'EXERCISE' | 'QUIZ';
  estimatedMinutes: number;
}

export interface Milestone {
  id: string;
  sequenceOrder: number;
  title: string;
  description: string;
  estimatedHours: number;
  isLocked: boolean;
  modules: Module[];
}

export interface LearningPath {
  id: string;
  title: string;
  estimatedHours: number;
  domain: string;
  milestones: Milestone[];
}

export interface Progress {
  currentMilestoneId: string | null;
  currentModuleId: string | null;
  completedModulesCount: number;
  completionRate: number;
  streakDays?: number;
  overallCompletionPct?: number;
  timeSpentMinutes?: number;
}

export function useLearnerDashboard() {
  const apiClient = useApiClient();

  const { data: path, isLoading: pathLoading } = useQuery({
    queryKey: ['my-path'],
    queryFn: () => apiClient.get<{ data: LearningPath | null }>('/paths/my'),
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['my-progress'],
    queryFn: () => apiClient.get<{ data: Progress | null }>('/progress/me'),
  });

  return {
    path: path?.data || null,
    progress: progress?.data || null,
    isLoading: pathLoading || progressLoading,
  };
}
