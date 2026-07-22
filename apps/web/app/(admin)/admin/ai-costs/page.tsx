'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { TrendingUp, BarChart2, Building2 } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface DailyCostPoint {
  date: string;
  costUsd: number;
  tokensUsed: number;
}

interface OrgRow {
  id: string;
  name: string;
  logoUrl: string | null;
  planTier: string;
  aiCostThisMonth: number;
  tokensThisMonth: number;
}

export default function AdminAiCostsPage() {
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ai-costs'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: DailyCostPoint[] }>(
        '/admin/ai-costs',
      );
      return res.data;
    },
    staleTime: 5 * 60_000,
  });

  // Also fetch per-org breakdown for the table
  const { data: orgsData } = useQuery({
    queryKey: ['admin-orgs-costs'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{
        success: boolean;
        data: { orgs: OrgRow[] };
      }>('/admin/orgs?limit=50');
      return (res.data?.orgs ?? []).sort(
        (a, b) => b.aiCostThisMonth - a.aiCostThisMonth,
      );
    },
    staleTime: 5 * 60_000,
  });

  // Compute totals from daily series
  const totalLast30Days = (data ?? []).reduce((s, d) => s + d.costUsd, 0);
  const totalTokensLast30 = (data ?? []).reduce((s, d) => s + d.tokensUsed, 0);
  const peakDay = (data ?? []).reduce(
    (max, d) => (d.costUsd > (max?.costUsd ?? 0) ? d : max),
    null as DailyCostPoint | null,
  );

  // Monthly view: group daily data by month
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of data ?? []) {
      const month = d.date.slice(0, 7); // "2026-07"
      map[month] = (map[month] ?? 0) + d.costUsd;
    }
    return Object.entries(map).map(([month, costUsd]) => ({
      month: new Date(month + '-01').toLocaleDateString('en', {
        month: 'short',
        year: '2-digit',
      }),
      costUsd: Math.round(costUsd * 100) / 100,
    }));
  }, [data]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="AI Cost Analysis"
        subtitle="Platform-wide AI spend across all organizations"
      />

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Last 30 Days
          </p>
          <p className="text-2xl font-bold text-amber-400 tabular-nums">
            ${totalLast30Days.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total AI spend</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Tokens Consumed
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {(totalTokensLast30 / 1_000_000).toFixed(2)}M
          </p>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Peak Day
          </p>
          <p className="text-2xl font-bold text-rose-400 tabular-nums">
            ${peakDay?.costUsd?.toFixed(2) ?? '0.00'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {peakDay
              ? new Date(peakDay.date).toLocaleDateString('en', {
                  month: 'short',
                  day: 'numeric',
                })
              : '—'}
          </p>
        </Card>
      </div>

      {/* ── Daily cost area chart ── */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-amber-400" />
          Daily AI Cost — Last 30 Days (All Organizations)
        </p>
        {isLoading ? (
          <Skeleton className="h-52 w-full rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={data}
              margin={{ top: 4, right: 12, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradAiCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
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
                  new Date(d).toLocaleDateString('en', {
                    month: 'short',
                    day: 'numeric',
                  })
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
                formatter={(v: any, name: any) => [
                  name === 'costUsd'
                    ? `$${(v || 0).toFixed(4)}`
                    : `${(((v as number) || 0) / 1000).toFixed(1)}K tokens`,
                  name === 'costUsd' ? 'AI Cost' : 'Tokens',
                ]}
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                labelFormatter={(d: any) =>
                  d
                    ? new Date(d).toLocaleDateString('en', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })
                    : ''
                }
              />
              <Area
                type="monotone"
                dataKey="costUsd"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#gradAiCost)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Monthly bar chart ── */}
      {monthlyData.length > 1 && (
        <Card className="p-5">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-amber-400" />
            Monthly AI Cost Summary
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={monthlyData}
              margin={{ top: 4, right: 12, left: -12, bottom: 0 }}
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
                formatter={(v: any) => [`$${(v || 0).toFixed(2)}`, 'AI Cost']}
              />
              <Bar
                dataKey="costUsd"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Cost by Organization table ── */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-amber-400" />
          Cost by Organization — This Month
        </p>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">#</TableHead>
                <TableHead className="text-muted-foreground">
                  Organization
                </TableHead>
                <TableHead className="text-muted-foreground">Plan</TableHead>
                <TableHead className="text-muted-foreground text-right">
                  Tokens (MTD)
                </TableHead>
                <TableHead className="text-muted-foreground text-right">
                  AI Cost (MTD)
                </TableHead>
                <TableHead className="text-muted-foreground">
                  % of Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orgsData ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No AI usage recorded this month
                  </TableCell>
                </TableRow>
              ) : (
                (() => {
                  const grandTotal = (orgsData ?? []).reduce(
                    (s, o) => s + o.aiCostThisMonth,
                    0,
                  );
                  const activeOrgs = (orgsData ?? []).filter(
                    (o) => o.aiCostThisMonth > 0,
                  );
                  if (activeOrgs.length === 0) {
                    return (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          No active AI usage recorded this month
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return activeOrgs.map((org, i) => {
                    const pct =
                      grandTotal > 0
                        ? Math.round((org.aiCostThisMonth / grandTotal) * 100)
                        : 0;
                    return (
                      <TableRow
                        key={org.id}
                        className="border-border hover:bg-secondary/20 cursor-pointer"
                        onClick={() =>
                          (window.location.href = `/admin/organizations/${org.id}`)
                        }
                      >
                        <TableCell className="text-muted-foreground text-sm w-8">
                          {i + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 rounded-lg">
                              <AvatarImage src={org.logoUrl ?? undefined} />
                              <AvatarFallback className="text-[10px] rounded-lg bg-primary/10 text-primary font-bold">
                                {org.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {org.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {org.planTier}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {((org.tokensThisMonth || 0) / 1000).toFixed(1)}K
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-semibold text-amber-400">
                          ${(org.aiCostThisMonth || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full bg-amber-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums w-8">
                              {pct}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
