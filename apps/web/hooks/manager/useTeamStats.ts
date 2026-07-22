'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export type TimeSeriesPoint = {
  date: string;
  activeUsers: number;
  completions: number;
  hoursLearned: number;
};

export function useTeamStats(days = 30) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['manager-stats', days],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: TimeSeriesPoint[] }>(
        `/manager/team/stats?days=${days}`,
      );
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}
