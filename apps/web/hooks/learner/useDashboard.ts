'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { createApiClient } from '@/lib/api-client';
import { usePrevious } from '../usePrevious';

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

const STREAK_MILESTONES = [7, 14, 21, 30, 60, 100];

export function useDashboard() {
  const { getToken } = useAuth();

  const query = useQuery({
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
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true, // re-fetch when tab is refocused
    select: (res) => res.data,
  });

  const prevStreak = usePrevious(query.data?.progress?.streakDays);

  useEffect(() => {
    const current = query.data?.progress?.streakDays;
    if (prevStreak === undefined || !current) return;

    const crossed = STREAK_MILESTONES.find(
      (m) => prevStreak < m && current >= m,
    );

    if (crossed) {
      toast.success(`🔥 ${crossed}-Day Streak!`, {
        description:
          crossed === 7
            ? 'One full week of learning — incredible!'
            : crossed === 14
              ? "Two weeks strong! You're unstoppable."
              : crossed === 30
                ? "30 days! You're a learning champion 🏆"
                : `${crossed} days and counting — keep going!`,
        duration: 6000,
      });
    }
  }, [query.data?.progress?.streakDays, prevStreak]);

  return query;
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
