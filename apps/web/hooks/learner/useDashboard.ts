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
    currentMilestoneId?: string | null;
    currentModuleId?: string | null;
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
  currentMilestone?: {
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
  currentModule?: {
    id: string;
    title: string;
    moduleType: string;
    estimatedMinutes: number;
    milestone?: {
      id: string;
      title: string;
      sequenceOrder: number;
    };
  } | null;
  nextModule?: {
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
      moduleId?: string;
    };
  }>;
  activityByDate?: Record<string, number>;
}

export function useDashboard() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['learner-dashboard'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: DashboardData }>(
        '/progress/snapshot',
      );
      return res;
    },
    staleTime: 30_000, // 30s cache
    refetchInterval: 60_000, // refresh every 60s
    refetchOnWindowFocus: true, // re-fetch when tab is refocused
    select: (res) => res.data,
  });
}

export interface ResumeData {
  currentPage: string;
  redirectUrl: string | null;
  pathId?: string;
  pathTitle?: string;
  milestoneId?: string;
  moduleId?: string;
  currentModule?: {
    title: string;
    moduleType: string;
    estimatedMinutes: number;
    milestone?: {
      title: string;
    };
  } | null;
  progressSummary?: {
    completionPct: number;
    streakDays: number;
    timeSpentMinutes: number;
    lastActivityAt?: string | null;
    status?: string;
  } | null;
  message?: string;
}

export function useResume() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['resume'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: ResumeData }>(
        '/progress/resume',
      );
      return res;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    select: (res) => res.data,
  });
}
