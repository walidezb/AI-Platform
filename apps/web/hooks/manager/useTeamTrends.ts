'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';
import { TeamStats } from './useTeamOverview';

export interface TeamTrends {
  total?: number;
  active?: number;
  avgCompletion?: number;
  completed?: number;
  totalHoursLearned?: number;
  onStreakToday?: number;
}

export function useTeamTrends() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['manager-trends'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{
        success: boolean;
        data: { stats: TeamStats; trends: TeamTrends };
      }>('/manager/team/trends');
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}
