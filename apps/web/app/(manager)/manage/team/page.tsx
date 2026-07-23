'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SkeletonEmployeeTable } from '@/components/skeletons';
import { ApiErrorState } from '@/components/ApiErrorState';
import { useApiError } from '@/hooks/useApiError';
import { EmployeeTable } from '@/components/manager/EmployeeTable';
import { FilterToolbar } from '@/components/manager/FilterToolbar';
import { useTeamOverview } from '@/hooks/manager/useTeamOverview';
import { useTeamFilters } from '@/hooks/manager/useTeamFilters';
import { createApiClient } from '@/lib/api-client';

type Dept = { id: string; name: string };

export default function TeamPage() {
  const t = useTranslations('manager');
  const router = useRouter();
  const { getToken } = useAuth();
  const { filters, setFilters } = useTeamFilters();
  const { data, isLoading, isError, error, refetch } = useTeamOverview(filters);
  const { status, message } = useApiError(error);

  // Fetch departments for filter dropdown
  const { data: departments } = useQuery({
    queryKey: ['org-departments'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: Dept[] }>('/departments');
      return res.data;
    },
    select: (data) => data.map((d) => d.name),
    staleTime: 10 * 60_000,
  });

  const employees = data?.employees ?? [];
  const pagination = data?.pagination;
  const stats = data?.stats;

  const distinctRoles = React.useMemo(() => {
    const all = (data?.employees ?? [])
      .map((e) => e.jobTitle)
      .filter((r): r is string => !!r);
    return [...new Set(all)].sort();
  }, [data]);

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title={t('teamOverview')}
        subtitle={
          pagination
            ? `${pagination.total} of ${stats?.total ?? 0} employees`
            : 'Loading...'
        }
        action={
          <Button
            onClick={() => router.push('/manage/invitations')}
            className="bg-gradient-primary border-0 text-white font-semibold"
          >
            <UserPlus className="h-4 w-4 me-2" />
            {t('inviteEmployee')}
          </Button>
        }
      />

      <Card className="p-5 space-y-5 border-slate-800 bg-slate-900/60">
        {/* Filter toolbar */}
        <FilterToolbar
          departments={departments ?? []}
          roles={distinctRoles}
          filters={filters}
          total={pagination?.total ?? 0}
          allTotal={stats?.total ?? 0}
          onChange={setFilters}
        />

        {/* Table / Skeleton / Error */}
        {isError ? (
          <ApiErrorState status={status} message={message} onRetry={refetch} />
        ) : isLoading ? (
          <SkeletonEmployeeTable />
        ) : (
          <EmployeeTable
            employees={employees}
            onViewEmployee={(id) => router.push(`/manage/team/${id}`)}
            serverPagination={pagination}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        )}
      </Card>
    </div>
  );
}
