import { QueryClient } from '@tanstack/react-query';

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // 30s default stale time
        gcTime: 5 * 60_000, // 5 min garbage collection
        retry: 1, // retry once on failure
        refetchOnWindowFocus: false, // don't refetch on tab focus
        refetchOnMount: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });

export const queryClient = createQueryClient();
