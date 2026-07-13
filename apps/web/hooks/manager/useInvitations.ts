import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export interface Invitation {
  id: string;
  email: string;
  fullName: string;
  role: string;
  departmentId: string | null;
  jobTitle: string | null;
  invitationStatus: 'PENDING' | 'IN_PROGRESS' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  onboardingToken: string | null;
  onboardingTokenExpiry: string | null;
  createdAt: string;
  department?: {
    name: string;
  } | null;
}

export function useInvitations() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: Invitation[] }>('/invitations');
      return res.data;
    },
    refetchInterval: 30 * 1000, // Refetch every 30s
  });

  const inviteMutation = useMutation({
    mutationFn: async (dto: { email: string; fullName: string; jobTitle?: string; departmentId?: string }) => {
      const client = createApiClient(getToken);
      return client.post<{ success: boolean; data: any }>('/invitations/invite', dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['org-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
    },
  });

  const bulkInviteMutation = useMutation({
    mutationFn: async (employees: { email: string; fullName: string; jobTitle?: string; departmentId?: string }[]) => {
      const client = createApiClient(getToken);
      return client.post<{ success: boolean; data: any }>('/invitations/bulk', { employees });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['org-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (userId: string) => {
      const client = createApiClient(getToken);
      return client.post<{ success: boolean; data: any }>(`/invitations/${userId}/resend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const client = createApiClient(getToken);
      return client.delete<{ success: boolean; message: string }>(`/invitations/${userId}/revoke`);
    },
    onMutate: async (userId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['invitations'] });

      // Snapshot previous value
      const previousInvitations = queryClient.getQueryData<Invitation[]>(['invitations']);

      // Optimistically update the list
      if (previousInvitations) {
        queryClient.setQueryData<Invitation[]>(
          ['invitations'],
          previousInvitations.map((inv) =>
            inv.id === userId ? { ...inv, invitationStatus: 'REVOKED', onboardingToken: null, onboardingTokenExpiry: null } : inv
          )
        );
      }

      return { previousInvitations };
    },
    onError: (err, userId, context) => {
      if (context?.previousInvitations) {
        queryClient.setQueryData(['invitations'], context.previousInvitations);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['org-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
    },
  });

  return {
    invitations: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invite: inviteMutation.mutateAsync,
    isInviting: inviteMutation.isPending,
    bulkInvite: bulkInviteMutation.mutateAsync,
    isBulkInviting: bulkInviteMutation.isPending,
    resendInvite: resendMutation.mutateAsync,
    isResending: resendMutation.isPending,
    revokeInvite: revokeMutation.mutateAsync,
    isRevoking: revokeMutation.isPending,
  };
}
