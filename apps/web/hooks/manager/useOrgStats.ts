import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export interface OrgStats {
  totalEmployees: number;
  activeEmployees: number;
  completedEmployees: number;
  notStartedEmployees: number;
  pathsGenerated: number;
  avgCompletionPct: number;
}

export function useOrgStats(orgId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['org-stats', orgId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: OrgStats }>(`/orgs/${orgId}/stats`);
      return res.data;
    },
    refetchInterval: 60 * 1000, // refresh every 60s
    enabled: !!orgId,
  });
}
