'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import {
  Building2,
  Users,
  Zap,
  Activity,
  DollarSign,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { createApiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface AdminStatsResponse {
  stats: {
    totalOrgs: number;
    activeOrgs: number;
    totalLearners: number;
    totalPaths: number;
    aiSpendToday: number;
    aiSpendThisMonth: number;
    dau: number;
    newOrgsThisMonth: number;
  };
  newOrgs: Array<{ month: string; value: number }>;
  dailyCost: Array<{ date: string; costUsd: number; tokensUsed: number }>;
}

function StatCard({
  label,
  value,
  icon,
  color = 'default',
}: {
  label: string;
  value: string | number | undefined;
  icon: React.ReactNode;
  color?: 'default' | 'violet' | 'amber' | 'emerald';
}) {
  return (
    <Card className="p-4">
      <div
        className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center mb-3',
          color === 'violet'
            ? 'bg-violet-500/10 text-violet-400'
            : color === 'amber'
            ? 'bg-amber-500/10 text-amber-400'
            : color === 'emerald'
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-primary/10 text-primary',
        )}
      >
        {icon}
      </div>
      {value === undefined ? (
        <Skeleton className="h-7 w-20 mb-1" />
      ) : (
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      )}
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: AdminStatsResponse }>(
        '/admin/stats',
      );
      return res.data;
    },
    staleTime: 2 * 60_000,
  });

  const stats = data?.stats;
  const newOrgs = data?.newOrgs ?? [];
  const dailyCost = data?.dailyCost ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Platform Overview"
        subtitle="Internal dashboard — PLATFORM_ADMIN only"
        badge="Internal"
      />

      {/* ── Stats row: 4 cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Organizations',
            value: isLoading ? undefined : stats?.totalOrgs ?? 0,
            icon: <Building2 className="h-4.5 w-4.5" />,
            color: 'default' as const,
          },
          {
            label: 'Total Learners',
            value: isLoading ? undefined : stats?.totalLearners ?? 0,
            icon: <Users className="h-4.5 w-4.5" />,
            color: 'violet' as const,
          },
          {
            label: 'AI Spend Today',
            value: isLoading
              ? undefined
              : `$${(stats?.aiSpendToday ?? 0).toFixed(2)}`,
            icon: <Zap className="h-4.5 w-4.5" />,
            color: 'amber' as const,
          },
          {
            label: 'Daily Active Users',
            value: isLoading ? undefined : stats?.dau ?? 0,
            icon: <Activity className="h-4.5 w-4.5" />,
            color: 'emerald' as const,
          },
        ].map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* ── Secondary stats row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          {isLoading ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">
              {stats?.totalPaths ?? 0}
            </p>
          )}
          <p className="text-sm text-muted-foreground">Total Paths Generated</p>
        </Card>
        <Card className="p-4">
          {isLoading ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">
              {stats?.activeOrgs ?? 0}
            </p>
          )}
          <p className="text-sm text-muted-foreground">Active Organizations</p>
        </Card>
        <Card className="p-4">
          {isLoading ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <p className="text-2xl font-bold text-primary tabular-nums">
              {stats?.newOrgsThisMonth ?? 0}
            </p>
          )}
          <p className="text-sm text-muted-foreground">New Orgs This Month</p>
        </Card>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* New orgs per month — Bar chart */}
        <Card className="p-5">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            New Organizations per Month
          </p>
          {isLoading ? (
            <Skeleton className="h-[180px] w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={newOrgs}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                  formatter={(v: any) => [v, 'New Orgs']}
                />
                <Bar
                  dataKey="value"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Daily AI cost — Area chart */}
        <Card className="p-5">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-400" />
            Platform AI Cost — Last 30 Days
          </p>
          {isLoading ? (
            <Skeleton className="h-[180px] w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={dailyCost}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={(d) =>
                    d
                      ? new Date(d).toLocaleDateString('en', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : ''
                  }
                  interval={6}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                  formatter={(v: any) => [`$${(v || 0).toFixed(4)}`, 'AI Cost']}
                />
                <Area
                  type="monotone"
                  dataKey="costUsd"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#gradCost)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
