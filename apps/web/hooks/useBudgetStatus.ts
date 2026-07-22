'use client';

import { useQuery } from '@tanstack/react-query';
import { useUser, useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export function useBudgetStatus() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const orgId = user?.publicMetadata?.organizationId as string | undefined;
  const role = user?.publicMetadata?.role as string | undefined;

  return useQuery({
    queryKey: ['budget-status', orgId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const res = await client.get<{ success: boolean; data: any }>(
        `/usage/org/${orgId}`,
      );
      return res.data;
    },
    enabled: !!orgId && role !== 'PLATFORM_ADMIN',
    staleTime: 5 * 60_000,
    select: (res) => ({
      percentUsed: res?.currentPeriod?.percentUsed ?? 0,
      isWarning: (res?.currentPeriod?.percentUsed ?? 0) >= 80,
      isExceeded: (res?.currentPeriod?.percentUsed ?? 0) >= 100,
    }),
  });
}
