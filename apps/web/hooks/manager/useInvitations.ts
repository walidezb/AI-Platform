'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export type InviteStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'ACCEPTED'
  | 'REVOKED'
  | 'EXPIRED';

export interface InvitationRow {
  userId: string;
  fullName: string;
  email: string;
  department: string | null;
  jobTitle: string | null;
  invitedAt: string | Date | null;
  expiresAt: string | Date | null;
  inviteOpenedAt: string | Date | null;
  completedAt: string | Date | null;
  inviteStatus: InviteStatus;
  onboardingLink: string | null;
  tokenPreview?: string | null;
  isExpired: boolean;
}

export interface InviteStats {
  total: number;
  pending: number;
  inProgress: number;
  accepted: number;
  revoked: number;
  expired: number;
}

export function useInvitations() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: InvitationRow[] }>(
        '/invitations',
      );
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useInviteStats() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['invite-stats'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: InviteStats }>(
        '/invitations/stats',
      );
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useRegenerateLink() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const client = createApiClient(getToken);
      return await client.post<{ success: boolean; data: { link: string } }>(
        `/invitations/${userId}/regenerate-link`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['invite-stats'] });
    },
  });
}

export function useResendInvite() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const client = createApiClient(getToken);
      return await client.post(`/invitations/${userId}/resend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['invite-stats'] });
    },
  });
}

export function useRevokeInvite() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const client = createApiClient(getToken);
      return await client.delete(`/invitations/${userId}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['invite-stats'] });
    },
  });
}

export function useBulkResend() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userIds: string[]) => {
      const client = createApiClient(getToken);
      return await Promise.all(
        userIds.map((id) => client.post(`/invitations/${id}/resend`)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['invite-stats'] });
    },
  });
}

export function useBulkRevoke() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userIds: string[]) => {
      const client = createApiClient(getToken);
      return await client.post('/invitations/bulk-revoke', { userIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['invite-stats'] });
    },
  });
}
