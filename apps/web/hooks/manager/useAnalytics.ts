'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export interface DeptCompletion {
  department: string;
  avgCompletion: number;
  totalEmployees: number;
  completed: number;
}

export interface TopPerformer {
  rank: number;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  department: string | null;
  jobTitle: string | null;
  completionPct: number;
  timeSpentHours: number;
  exercisesPassed: number;
  streakDays: number;
}

export interface AtRiskLearner {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  department: string | null;
  jobTitle?: string | null;
  completionPct: number;
  daysSinceActive: number | null;
  joinedDaysAgo: number;
  riskReason: string;
}

export interface RadarPoint {
  domain: string;
  teamStrength: number;
  teamGap: number;
}

export interface VelocityPoint {
  userId: string;
  fullName: string;
  department: string | null;
  daysSinceJoined: number;
  completionPct: number;
  timeSpentHours: number;
  status: string;
}

export function useCompletionByDept() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['analytics-dept'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: DeptCompletion[] }>(
        '/manager/analytics/completion-by-dept',
      );
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useTopPerformers() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['analytics-top'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: TopPerformer[] }>(
        '/manager/analytics/top-performers',
      );
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useAtRiskLearners(department?: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['analytics-risk', department],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const url = department
        ? `/manager/analytics/at-risk?department=${encodeURIComponent(department)}`
        : '/manager/analytics/at-risk';
      const res = await client.get<{ success: boolean; data: AtRiskLearner[] }>(
        url,
      );
      return res.data;
    },
    staleTime: 2 * 60_000,
  });
}

export function useSkillRadar() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['analytics-radar'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: RadarPoint[] }>(
        '/manager/analytics/skill-radar',
      );
      return res.data;
    },
    staleTime: 10 * 60_000,
  });
}

export function useLearningVelocity() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['analytics-velocity'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: VelocityPoint[] }>(
        '/manager/analytics/velocity',
      );
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}
