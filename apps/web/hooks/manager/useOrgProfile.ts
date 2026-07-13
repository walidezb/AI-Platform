import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';
import { notify } from '@/lib/toast';

export interface OrgProfile {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  industry: string | null;
  timezone: string;
  defaultLanguage: 'EN' | 'AR';
  planTier: string;
  aiTokensBudget: number;
  aiTokensUsed: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
  };
}

export function useOrgProfile(orgId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['org-profile', orgId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: OrgProfile }>(`/orgs/${orgId}/profile`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!orgId,
  });
}

export function useUpdateOrg(orgId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name?: string;
      logoUrl?: string;
      industry?: string;
      timezone?: string;
      defaultLanguage?: 'EN' | 'AR';
    }) => {
      const client = createApiClient(getToken);
      return client.patch<{ success: boolean; data: any }>(`/orgs/${orgId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-profile', orgId] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      notify.success('Organization settings saved');
    },
    onError: () => {
      notify.error('Failed to save settings');
    },
  });
}
