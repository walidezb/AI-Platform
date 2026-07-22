'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export interface FeatureBreakdown {
  feature: string;
  callCount: number;
  tokensInput: number;
  tokensOutput: number;
  totalTokens: number;
  costUsd: number;
  pctOfTotal: number;
}

export interface EmployeeBreakdown {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  callCount: number;
  totalTokens: number;
  costUsd: number;
  pctOfTotal: number;
}

export interface DailyBreakdown {
  date: string;
  costUsd: number;
  tokensUsed: number;
  calls: number;
}

export interface UsageTotals {
  totalCostUsd: number;
  totalTokens: number;
  totalCalls: number;
  uniqueUsers: number;
}

export interface OrgUsageDetailResponse {
  byFeature: FeatureBreakdown[];
  byEmployee: EmployeeBreakdown[];
  byDay: DailyBreakdown[];
  totals: UsageTotals;
}

export function useOrgUsageDetail(
  orgId: string,
  startDate?: string,
  endDate?: string,
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['org-usage-detail', orgId, startDate, endDate],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await client.get<{
        success: boolean;
        data: OrgUsageDetailResponse;
      }>(`/usage/org/${orgId}/detail${queryString}`);

      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!orgId,
  });
}
