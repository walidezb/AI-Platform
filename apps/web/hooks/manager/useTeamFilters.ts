'use client';

import { useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { TeamFilters } from './useTeamOverview';

export function useTeamFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read current filters from URL
  const filters: TeamFilters = {
    department: searchParams.get('dept') ?? undefined,
    role: searchParams.get('role') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    search: searchParams.get('q') ?? undefined,
    sortBy: searchParams.get('sort') ?? 'name',
    sortOrder: (searchParams.get('order') ?? 'asc') as 'asc' | 'desc',
    page: parseInt(searchParams.get('page') ?? '1', 10),
  };

  // Write filters back to URL
  const setFilters = useCallback(
    (newFilters: TeamFilters) => {
      const params = new URLSearchParams();

      if (newFilters.department) params.set('dept', newFilters.department);
      if (newFilters.role) params.set('role', newFilters.role);
      if (newFilters.status) params.set('status', newFilters.status);
      if (newFilters.search) params.set('q', newFilters.search);
      if (newFilters.sortBy && newFilters.sortBy !== 'name')
        params.set('sort', newFilters.sortBy);
      if (newFilters.sortOrder && newFilters.sortOrder !== 'asc')
        params.set('order', newFilters.sortOrder);
      if (newFilters.page && newFilters.page > 1)
        params.set('page', String(newFilters.page));

      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [pathname, router],
  );

  return { filters, setFilters };
}
