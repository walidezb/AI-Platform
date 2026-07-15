import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/hooks/useApiClient';

export function useLearnerDashboard() {
  const apiClient = useApiClient();

  const { data: path, isLoading: pathLoading } = useQuery({
    queryKey: ['my-path'],
    queryFn: () => apiClient.get<{ data: Record<string, unknown> | null }>('/paths/my'),
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['my-progress'],
    queryFn: () => apiClient.get<{ data: Record<string, unknown> | null }>('/progress/me'),
  });

  return {
    path: path?.data || null,
    progress: progress?.data || null,
    isLoading: pathLoading || progressLoading,
  };
}
