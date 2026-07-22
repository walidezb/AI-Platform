'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export interface AdminOrgDetails {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  logoUrl: string | null;
  planTier: string | null;
  status: string;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  aiTokensBudget: number;
  suspendedAt: string | Date | null;
  suspendedReason: string | null;
  createdAt: string | Date;
  users: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    department: string | null;
    createdAt: string | Date;
    userProgress: Array<{
      status: string;
      overallCompletionPct: number;
      lastActivityAt: string | Date | null;
    }>;
  }>;
  learningPaths: Array<{
    id: string;
    title: string;
    domain: string;
    status: string;
    createdAt: string | Date;
    _count: { milestones: number };
  }>;
  alertSettings: any;
  monthlyUsage: {
    costUsd: number;
    tokensUsed: number;
  };
  allTimeUsage: {
    costUsd: number;
    tokensUsed: number;
  };
}

export function useAdminOrgDetail(orgId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['admin-org', orgId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{
        success: boolean;
        data: AdminOrgDetails;
      }>(`/admin/orgs/${orgId}`);
      return res.data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
