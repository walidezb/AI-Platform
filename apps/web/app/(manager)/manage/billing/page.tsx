'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  AlertOctagon,
  AlertTriangle,
  Gauge,
  DollarSign,
  FileText,
  Zap,
  Activity,
  PieChart as PieChartIcon,
  TrendingUp,
  Users,
  Receipt,
  Check,
  Clock,
  Download,
} from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  useBillingDashboard,
  useBillingInvoices,
  useBillingPortal,
} from '@/hooks/billing/useBillingDashboard';
import { BudgetGauge } from '@/components/billing/BudgetGauge';
import { TopUpDialog } from '@/components/billing/TopUpDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';

function formatDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function BillingPage() {
  const { user } = useUser();
  const orgId = (user?.publicMetadata?.organizationId as string) || '';

  const { data, isLoading } = useBillingDashboard(orgId);
  const { data: invoices, isLoading: loadInv } = useBillingInvoices();
  const portal = useBillingPortal();

  const cp = data?.currentPeriod;
  const percent = cp?.percentUsed ?? 0;

  // Feature breakdown donut chart configuration
  const FEATURE_LABELS: Record<string, string> = {
    assessment: 'Assessment',
    path_generation: 'Path Generation',
    resource_curation: 'Resource Curation',
    exercise_evaluation: 'Exercise Evaluation',
    unknown: 'Other',
  };
  const FEATURE_COLORS = [
    '#6366f1',
    '#34d399',
    '#f59e0b',
    '#ec4899',
    '#64748b',
  ];

  const donutData = (data?.byFeature ?? []).map((f, i) => ({
    name: FEATURE_LABELS[f.feature] ?? f.feature,
    value: f.tokensUsed,
    cost: f.costUsd,
    calls: f.callCount,
    fill: FEATURE_COLORS[i % FEATURE_COLORS.length],
  }));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader
          title="Billing & Usage"
          subtitle="Monitor your AI token consumption and manage your plan"
        />
        <div className="flex items-center gap-2">
          <TopUpDialog />
          <Button
            variant="outline"
            size="sm"
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage Billing
          </Button>
        </div>
      </div>

      {/* ── Plan + period info banner ── */}
      {cp && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm text-muted-foreground flex-wrap">
          <span
            className={cn(
              'px-2 py-0.5 rounded-md text-xs font-semibold',
              cp.planTier === 'enterprise'
                ? 'bg-violet-500/15 text-violet-400'
                : cp.planTier === 'growth'
                ? 'bg-primary/15 text-primary'
                : 'bg-secondary text-muted-foreground',
            )}
          >
            {cp.planTier.charAt(0).toUpperCase() + cp.planTier.slice(1)} Plan
          </span>
          <span>·</span>
          <span>
            Billing period:{' '}
            <strong className="text-foreground">
              {formatDate(cp.start)}
            </strong>{' '}
            →{' '}
            <strong className="text-foreground">
              {formatDate(cp.end)}
            </strong>
          </span>
          <span>·</span>
          <span
            className={cn(
              'font-medium',
              cp.subStatus === 'active'
                ? 'text-emerald-400'
                : cp.subStatus === 'trialing'
                ? 'text-primary'
                : cp.subStatus === 'past_due'
                ? 'text-rose-400'
                : 'text-muted-foreground',
            )}
          >
            {cp.subStatus === 'trialing'
              ? '🎁 Trial active'
              : cp.subStatus === 'active'
              ? '✓ Active'
              : cp.subStatus === 'past_due'
              ? '⚠️ Payment past due'
              : cp.subStatus}
          </span>
        </div>
      )}

      {/* ── Budget alert banners ── */}
      {percent >= 100 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4 border-rose-500/30 bg-rose-500/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                <AlertOctagon className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-rose-400">
                  🚨 AI budget exceeded — new AI operations are paused
                </p>
                <p className="text-xs text-muted-foreground">
                  Assessments and path generation are temporarily unavailable.
                  Upgrade your plan to resume.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-rose-500 hover:bg-rose-600 text-white shrink-0"
              onClick={() => portal.mutate()}
            >
              Upgrade Plan →
            </Button>
          </Card>
        </motion.div>
      )}

      {percent >= 80 && percent < 100 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4 border-amber-500/30 bg-amber-500/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-400">
                  ⚠️ You&apos;ve used {percent}% of your AI budget
                </p>
                <p className="text-xs text-muted-foreground">
                  At current usage rate, budget will be exceeded before the
                  period ends. Consider upgrading.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/30 hover:bg-amber-500/10 shrink-0"
              onClick={() => portal.mutate()}
            >
              View Plans →
            </Button>
          </Card>
        </motion.div>
      )}

      {/* ── SECTION 1: Usage gauge + stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Gauge */}
        <Card className="p-6 flex flex-col items-center justify-center">
          <p className="text-sm font-semibold mb-5 self-start flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Usage This Period
          </p>
          {isLoading ? (
            <Skeleton className="h-[180px] w-[180px] rounded-full" />
          ) : (
            <BudgetGauge
              percentUsed={percent}
              tokensUsed={cp?.tokensUsed ?? 0}
              budget={cp?.budget ?? 1_000_000}
              costUsd={cp?.costUsd ?? 0}
            />
          )}
        </Card>

        {/* Stats cards (2×2) */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {[
            {
              label: 'Cost to Date',
              value: `$${(cp?.costUsd ?? 0).toFixed(2)}`,
              icon: <DollarSign className="h-4.5 w-4.5" />,
              color: 'emerald' as const,
              sub: 'This billing period',
            },
            {
              label: 'Estimated Bill',
              value: `$${(data?.nextInvoiceEstimate?.amount ?? 0).toFixed(2)}`,
              icon: <FileText className="h-4.5 w-4.5" />,
              color: percent >= 80 ? ('amber' as const) : ('default' as const),
              sub: `Due ${formatDate(data?.nextInvoiceEstimate?.dueDate)}`,
            },
            {
              label: 'Tokens Used',
              value: `${((cp?.tokensUsed ?? 0) / 1000).toFixed(1)}K`,
              icon: <Zap className="h-4.5 w-4.5" />,
              color: 'violet' as const,
              sub: `of ${((cp?.budget ?? 0) / 1000).toFixed(0)}K budget`,
            },
            {
              label: 'AI Calls Made',
              value: (data?.byFeature ?? []).reduce((s, f) => s + f.callCount, 0),
              icon: <Activity className="h-4.5 w-4.5" />,
              color: 'default' as const,
              sub: 'This billing period',
            },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div
                className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center mb-3',
                  s.color === 'emerald'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : s.color === 'amber'
                    ? 'bg-amber-500/10 text-amber-400'
                    : s.color === 'violet'
                    ? 'bg-violet-500/10 text-violet-400'
                    : 'bg-primary/10 text-primary',
                )}
              >
                {s.icon}
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mb-1" />
              ) : (
                <p className="text-xl font-bold tabular-nums">{s.value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {s.label}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {s.sub}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* ── SECTION 2 + 3: Feature donut + Daily area chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Feature donut (2 of 5 cols) */}
        <Card className="lg:col-span-2 p-5">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-primary" />
            Usage by Feature
          </p>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : donutData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <RechartsPieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a2e',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    formatter={(v: any, _name: any, props: any) => [
                      `${((v || 0) / 1000).toFixed(1)}K tokens · $${(props.payload?.cost || 0).toFixed(3)}`,
                      props.payload?.name || '',
                    ]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="space-y-2 mt-3">
                {donutData.map((d) => (
                  <div
                    key={d.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: d.fill }}
                      />
                      <span className="text-muted-foreground">{d.name}</span>
                    </span>
                    <span className="font-medium tabular-nums">
                      {(d.value / 1000).toFixed(1)}K
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No AI usage this period
            </div>
          )}
        </Card>

        {/* Daily usage area chart (3 of 5 cols) */}
        <Card className="lg:col-span-3 p-5">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Daily Token Consumption — Last 30 Days
          </p>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : data?.dailyUsage?.some((d) => d.tokensUsed > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={data?.dailyUsage}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
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
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                  }
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
                    name === 'tokensUsed'
                      ? `${((v || 0) / 1000).toFixed(1)}K tokens`
                      : `$${(v || 0).toFixed(4)}`,
                    name === 'tokensUsed' ? 'Tokens' : 'Cost',
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
                  dataKey="tokensUsed"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#gradTokens)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              No usage data yet this period
            </div>
          )}
        </Card>
      </div>

      {/* ── SECTION 4: Usage by Employee ── */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Top AI Users This Period
        </p>
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-lg" />
        ) : (data?.byEmployee ?? []).length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">
                    Employee
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Tokens Used
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    AI Cost
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Most Used Feature
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Share
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.byEmployee ?? []).map((emp, i) => {
                  const totalTokens = cp?.tokensUsed || 1;
                  const share = Math.round(
                    (emp.tokensUsed / totalTokens) * 100,
                  );
                  return (
                    <TableRow
                      key={emp.userId}
                      className="border-border hover:bg-secondary/20"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-muted-foreground w-4 text-right tabular-nums">
                            {i + 1}
                          </span>
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={emp.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {emp.fullName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {emp.fullName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {emp.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {(emp.tokensUsed / 1000).toFixed(1)}K
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-emerald-400 font-medium">
                        ${emp.costUsd.toFixed(3)}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                          {FEATURE_LABELS[emp.topFeature] ?? emp.topFeature}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 tabular-nums">
                            {share}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
            No AI usage recorded yet
          </div>
        )}
      </Card>

      {/* ── SECTION 5: Invoices ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Invoices
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Manage Billing
          </Button>
        </div>

        {loadInv ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : (invoices ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No invoices yet</p>
            <p className="text-xs text-muted-foreground">
              Your first invoice will appear here after your trial ends.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">
                    Period
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Invoice
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoices ?? []).map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="border-border hover:bg-secondary/20"
                  >
                    <TableCell className="text-sm">
                      {formatDate(inv.periodStart)} — {formatDate(inv.periodEnd)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {inv.currency} ${inv.amountDue.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5',
                          'rounded-md text-xs font-medium',
                          inv.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : inv.status === 'open'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-secondary text-muted-foreground',
                        )}
                      >
                        {inv.status === 'paid' ? (
                          <>
                            <Check className="h-3 w-3" /> Paid
                          </>
                        ) : inv.status === 'open' ? (
                          <>
                            <Clock className="h-3 w-3" /> Open
                          </>
                        ) : (
                          inv.status
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {inv.hostedUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              window.open(inv.hostedUrl!, '_blank')
                            }
                          >
                            View
                          </Button>
                        )}
                        {inv.pdfUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => window.open(inv.pdfUrl!, '_blank')}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
