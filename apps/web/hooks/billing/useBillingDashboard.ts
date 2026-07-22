'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export interface UsageDashboardDto {
  currentPeriod: {
    start: string | Date;
    end: string | Date;
    tokensUsed: number;
    costUsd: number;
    budget: number;
    percentUsed: number;
    planTier: string;
    subStatus: string;
  };
  nextInvoiceEstimate: {
    amount: number;
    dueDate: string | Date;
  };
  byFeature: Array<{
    feature: string;
    tokensUsed: number;
    costUsd: number;
    callCount: number;
  }>;
  byEmployee: Array<{
    userId: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    tokensUsed: number;
    costUsd: number;
    topFeature: string;
  }>;
  dailyUsage: Array<{
    date: string;
    tokensUsed: number;
    costUsd: number;
  }>;
}

export interface InvoiceSummary {
  id: string;
  number: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  pdfUrl: string | null;
  hostedUrl: string | null;
  createdAt: string | Date;
}

export function useBillingDashboard(orgId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['billing-dashboard', orgId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: UsageDashboardDto }>(
        `/usage/org/${orgId}`,
      );
      return res.data;
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });
}

export function useBillingInvoices() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['billing-invoices'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: InvoiceSummary[] }>(
        '/billing/invoices',
      );
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useBillingPortal() {
  const { getToken } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: { url: string } }>(
        '/billing/portal',
      );
      return res.data;
    },
    onSuccess: (res) => {
      if (res?.url) {
        window.open(res.url, '_blank');
      }
    },
  });
}
