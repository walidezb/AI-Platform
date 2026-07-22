'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useUser } from '@clerk/nextjs';
import { AlertTriangle } from 'lucide-react';
import { createApiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function BudgetWarningIcon({
  orgId,
  userRole,
}: {
  orgId?: string;
  userRole?: string;
}) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const organizationId =
    orgId || (user?.publicMetadata?.organizationId as string) || '';
  const role = userRole || (user?.publicMetadata?.role as string) || '';

  const { data: usageSummary } = useQuery({
    queryKey: ['usage-summary', organizationId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const res = await client.get<{ success: boolean; data: any }>(
        `/usage/org/${organizationId}`,
      );
      return res.data?.data?.currentPeriod;
    },
    enabled:
      !!organizationId &&
      (role === 'ORG_ADMIN' || user?.publicMetadata?.role === 'ORG_ADMIN'),
    staleTime: 10 * 60_000,
  });

  if (!usageSummary || usageSummary.percentUsed < 80) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Link href="/manage/billing">
            <div
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center',
                'transition-colors cursor-pointer',
                usageSummary.percentUsed >= 100
                  ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25'
                  : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25',
              )}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          {usageSummary.percentUsed >= 100
            ? '🚨 AI budget exceeded'
            : `⚠️ ${usageSummary.percentUsed}% of AI budget used`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
