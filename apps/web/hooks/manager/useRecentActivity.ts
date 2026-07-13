import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export interface ActivityItem {
  id: string;
  employeeName: string;
  avatarUrl: string | null;
  action: string;
  type: 'completed' | 'in-progress' | 'active';
  createdAt: string;
}

export function useRecentActivity() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: ActivityItem[] }>('/manager/activity');
      return res.data;
    },
    refetchInterval: 30 * 1000, // refresh every 30s
  });
}
