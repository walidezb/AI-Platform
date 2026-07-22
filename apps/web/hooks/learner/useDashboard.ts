'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export interface DashboardData {
  progress: {
    overallCompletionPct: number;
    timeSpentMinutes: number;
    streakDays: number;
    status: string;
    lastActivityAt?: string | null;
  };
  path: {
    id: string;
    title: string;
    domain: string;
    totalMilestones: number;
    estimatedHours: number;
    milestones: Array<{
      id: string;
      sequenceOrder: number;
      title: string;
      description: string;
      estimatedHours: number;
      isLocked: boolean;
      completedAt?: string | null;
      modules: Array<{
        id: string;
        title: string;
        moduleType: string;
        estimatedMinutes: number;
        isLocked: boolean;
        sequenceOrder: number;
      }>;
      _count?: {
        exercises: number;
      };
    }>;
  } | null;
  currentMilestone: {
    id: string;
    sequenceOrder: number;
    title: string;
    description: string;
    estimatedHours: number;
    modules: Array<{
      id: string;
      title: string;
      moduleType: string;
      estimatedMinutes: number;
      isLocked: boolean;
      sequenceOrder: number;
    }>;
  } | null;
  nextModule: {
    id: string;
    title: string;
    moduleType: string;
    estimatedMinutes: number;
    isLocked: boolean;
    sequenceOrder: number;
  } | null;
  recentActivity: Array<{
    id: string;
    completedAt: string;
    resource: {
      title: string;
      resourceType: string;
      moduleId: string;
    };
  }>;
}

export function useDashboard() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['learner-dashboard'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: DashboardData }>('/progress/summary');
      return res;
    },
    staleTime: 30_000, // 30s cache
    refetchInterval: 60_000, // refresh every 60s
    select: (res) => res.data,
  });
}
