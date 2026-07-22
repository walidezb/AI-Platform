'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export type EmployeeOverview = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  department: string | null;
  jobTitle: string | null;
  pathTitle: string | null;
  pathDomain: string | null;
  currentMilestone: string | null;
  completionPct: number;
  timeSpentMinutes: number;
  streakDays: number;
  lastActivityAt: string | null;
  daysSinceActive: number | null;
  isStalled: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
};

export type TeamStats = {
  total: number;
  active: number;
  completed: number;
  notStarted: number;
  avgCompletion: number;
  totalHoursLearned: number;
  onStreakToday: number;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type TeamOverviewResponse = {
  stats: TeamStats;
  employees: EmployeeOverview[];
  pagination?: PaginationMeta;
};

export interface TeamFilters {
  department?: string;
  role?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function useTeamOverview(filters: TeamFilters = {}) {
  const { getToken } = useAuth();

  const params = new URLSearchParams();
  if (filters.department) params.set('department', filters.department);
  if (filters.role) params.set('role', filters.role);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  return useQuery({
    queryKey: ['manager-team', filters],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: TeamOverviewResponse }>(
        `/manager/team?${params.toString()}`,
      );
      return res.data;
    },
    staleTime: 60_000,
  });
}
