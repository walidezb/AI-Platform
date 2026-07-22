'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import {
  Activity,
  Building2,
  Target,
  Trophy,
  AlertTriangle,
  Send,
  CheckCircle,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { createApiClient } from '@/lib/api-client';
import { notify } from '@/lib/toast';
import { useTeamStats } from '@/hooks/manager/useTeamStats';
import { useTeamOverview } from '@/hooks/manager/useTeamOverview';
import {
  useCompletionByDept,
  useTopPerformers,
  useAtRiskLearners,
  useSkillRadar,
  useLearningVelocity,
} from '@/hooks/manager/useAnalytics';

function toast({
  title,
  description,
  variant,
}: {
  title: string;
  description?: string;
  variant?: string;
}) {
  if (variant === 'destructive') {
    notify.error(title, description);
  } else {
    notify.success(title, description);
  }
}

const DOT_COLORS = {
  NOT_STARTED: '#334155',
  IN_PROGRESS: '#6366f1',
  COMPLETED: '#34d399',
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const VelocityTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d || !d.fullName) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs space-y-1 text-slate-100 shadow-xl">
      <p className="font-semibold text-sm">{d.fullName}</p>
      {d.department && <p className="text-slate-400">{d.department}</p>}
      <p>📅 Day {d.daysSinceJoined} since joining</p>
      <p>📊 {Math.round(d.completionPct)}% complete</p>
      <p>⏱ {d.timeSpentHours}h spent learning</p>
    </div>
  );
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [days, setDays] = useState(30);
  const [deptFilter, setDeptFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Fetch departments for filter dropdown
  const { data: departments } = useQuery({
    queryKey: ['org-departments'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: Array<{ name: string }> }>('/departments');
      return res.data;
    },
    select: (data) => data.map((d) => d.name),
    staleTime: 10 * 60_000,
  });

  // Fetch team overview to extract distinct roles
  const { data: teamOverview } = useTeamOverview({ page: 1, limit: 100 });
  const distinctRoles = useMemo(() => {
    const all = (teamOverview?.employees ?? [])
      .map((e) => e.jobTitle)
      .filter((r): r is string => !!r);
    return [...new Set(all)].sort();
  }, [teamOverview]);

  const { data: timeSeries, isLoading: loadingTs } = useTeamStats(days);
  const { data: deptData, isLoading: loadingDept } = useCompletionByDept();
  const { data: radarData, isLoading: loadingRadar } = useSkillRadar();
  const { data: topPerformers } = useTopPerformers();
  const { data: atRisk, isLoading: loadingRisk } = useAtRiskLearners(deptFilter || undefined);
  const { data: velocityData, isLoading: loadingVelocity } = useLearningVelocity();

  const filteredDeptData = deptFilter
    ? deptData?.filter((d) => d.department === deptFilter)
    : deptData;

  const filteredAtRisk = useMemo(() => {
    let rows = atRisk ?? [];
    if (roleFilter) rows = rows.filter((r) => r.jobTitle === roleFilter);
    return rows;
  }, [atRisk, roleFilter]);

  const filteredTop = useMemo(() => {
    let rows = topPerformers ?? [];
    if (roleFilter) rows = rows.filter((p) => p.jobTitle === roleFilter);
    return rows;
  }, [topPerformers, roleFilter]);

  /* Compute linear trend line endpoints using least-squares */
  const trendLine = useMemo(() => {
    if (!velocityData || velocityData.length < 2) return null;
    const n = velocityData.length;
    const sx = velocityData.reduce((s, p) => s + p.daysSinceJoined, 0);
    const sy = velocityData.reduce((s, p) => s + p.completionPct, 0);
    const sxy = velocityData.reduce(
      (s, p) => s + p.daysSinceJoined * p.completionPct,
      0,
    );
    const sxx = velocityData.reduce(
      (s, p) => s + p.daysSinceJoined * p.daysSinceJoined,
      0,
    );
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
    const intercept = (sy - slope * sx) / n;
    const maxX = Math.max(...velocityData.map((p) => p.daysSinceJoined));
    return [
      { x: 0, y: Math.max(0, intercept) },
      { x: maxX, y: Math.min(100, slope * maxX + intercept) },
    ];
  }, [velocityData]);

  // Mutation: send nudge email
  const sendNudge = useMutation({
    mutationFn: async (userId: string) => {
      const client = createApiClient(getToken);
      return await client.post(`/alerts/nudge/${userId}`);
    },
    onSuccess: () =>
      toast({
        title: '👋 Nudge sent!',
        description: 'The employee will receive a motivational email.',
      }),
    onError: () =>
      toast({ title: 'Failed to send nudge', variant: 'destructive' }),
  });

  return (
    <div className="p-6 space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader
          title="Team Analytics"
          subtitle="Understand how your team is learning"
        />
        <div className="flex items-center gap-3 flex-wrap">
          {/* Department filter */}
          <Select
            value={deptFilter || '__all__'}
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            onValueChange={(v: any) => setDeptFilter(v && v !== '__all__' ? v : '')}
          >
            <SelectTrigger
              className="h-8 w-[160px] border-slate-800 bg-slate-950 text-slate-100 text-xs"
              id="analytics-dept-filter"
            >
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
              <SelectItem value="__all__">All Departments</SelectItem>
              {departments?.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Role filter */}
          <Select
            value={roleFilter || '__all__'}
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            onValueChange={(v: any) => setRoleFilter(v && v !== '__all__' ? v : '')}
          >
            <SelectTrigger
              className="h-8 w-[150px] border-slate-800 bg-slate-950 text-slate-100 text-xs"
              id="analytics-role-filter"
            >
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
              <SelectItem value="__all__">All Roles</SelectItem>
              {distinctRoles.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date range selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Show:</span>
            {[7, 14, 30, 90].map((d) => (
              <Button
                key={d}
                size="sm"
                variant={days === d ? 'default' : 'outline'}
                onClick={() => setDays(d)}
                className={cn(
                  'h-8 px-3 text-xs',
                  days === d
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800',
                )}
              >
                {d}d
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CHART 1: Team Learning Activity (Area chart) ── */}
      <Card className="p-5 border-slate-800 bg-slate-900/60">
        <p className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-100">
          <Activity className="h-4 w-4 text-indigo-400" />
          Team Learning Activity
          <span className="text-xs font-normal text-slate-400 ml-1">
            — Last {days} days
          </span>
        </p>
        {loadingTs ? (
          <Skeleton className="h-56 w-full rounded-lg bg-slate-800" />
        ) : timeSeries && timeSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={timeSeries}
              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
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
                tickFormatter={(d: string | number) =>
                  new Date(d).toLocaleDateString('en', {
                    month: 'short',
                    day: 'numeric',
                  })
                }
                interval={Math.ceil(timeSeries.length / 6)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                yAxisId="users"
              />
              <YAxis
                yAxisId="hours"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={(v: string | number) => `${v}h`}
              />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />
              <Area
                yAxisId="users"
                type="monotone"
                dataKey="activeUsers"
                name="Active Learners"
                stroke="#6366f1"
                fill="url(#gradUsers)"
                strokeWidth={2}
              />
              <Area
                yAxisId="hours"
                type="monotone"
                dataKey="hoursLearned"
                name="Hours Learned"
                stroke="#34d399"
                fill="url(#gradHours)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-56 flex items-center justify-center text-sm text-slate-400">
            No activity data yet
          </div>
        )}
      </Card>

      {/* ── ROW: CHART 2 + CHART 3 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CHART 2: Completion by Department (Horizontal Bar) */}
        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-100">
            <Building2 className="h-4 w-4 text-indigo-400" />
            Completion by Department
          </p>
          {loadingDept ? (
            <Skeleton className="h-48 w-full rounded-lg bg-slate-800" />
          ) : filteredDeptData && filteredDeptData.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={Math.max(180, filteredDeptData.length * 42)}
            >
              <BarChart
                data={filteredDeptData}
                layout="vertical"
                margin={{ top: 4, right: 40, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={(v: string | number) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="department"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                  formatter={(v: any, _name: any, props: any) => [
                    `${v}% avg (${props?.payload?.completed ?? 0}/${props?.payload?.totalEmployees ?? 0} complete)`,
                    'Completion',
                  ]}
                />
                <Bar
                  dataKey="avgCompletion"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                  label={{
                    position: 'right',
                    fill: '#94a3b8',
                    fontSize: 11,
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    formatter: (v: any) => (v !== undefined && v !== null ? `${v}%` : ''),
                  }}
                >
                  {filteredDeptData.map((_, i) => {
                    const ratio =
                      filteredDeptData.length > 1
                        ? i / (filteredDeptData.length - 1)
                        : 0;
                    const r = Math.round(99 + (239 - 99) * ratio);
                    const g = Math.round(211 + (68 - 211) * ratio);
                    const b = Math.round(146 + (68 - 146) * ratio);
                    return <Cell key={i} fill={`rgb(${r},${g},${b})`} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">
              No department data yet
            </div>
          )}
        </Card>

        {/* CHART 3: Skill Coverage Radar */}
        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-100">
            <Target className="h-4 w-4 text-indigo-400" />
            Team Skill Coverage
            <span className="text-xs font-normal text-slate-400 ml-1">
              (from assessments)
            </span>
          </p>
          {loadingRadar ? (
            <Skeleton className="h-56 w-full rounded-lg bg-slate-800" />
          ) : radarData && radarData.length >= 3 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis
                  dataKey="domain"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: '#6b7280', fontSize: 9 }}
                />
                <Radar
                  name="Team Strength"
                  dataKey="teamStrength"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.4}
                />
                <Radar
                  name="Skill Gaps"
                  dataKey="teamGap"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.15}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-center px-4">
              <Target className="h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-400">
                Skill radar requires at least 3 completed assessments
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ── CHART 4: Learning Velocity (Scatter plot) ── */}
      <Card className="p-5 border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <p className="text-sm font-semibold flex items-center gap-2 text-slate-100">
            <Zap className="h-4 w-4 text-indigo-400" />
            Learning Velocity
          </p>
          <div className="flex items-center gap-4">
            {[
              { label: 'Not Started', color: '#334155' },
              { label: 'In Progress', color: '#6366f1' },
              { label: 'Completed', color: '#34d399' },
            ].map((l) => (
              <span
                key={l.label}
                className="flex items-center gap-1.5 text-xs text-slate-400"
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: l.color }}
                />
                {l.label}
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Each dot = one employee · Dashed line = team trend
        </p>

        {loadingVelocity ? (
          <Skeleton className="h-64 w-full rounded-lg bg-slate-800" />
        ) : velocityData && velocityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 8, right: 24, left: -12, bottom: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                type="number"
                dataKey="daysSinceJoined"
                name="Days Since Joining"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                label={{
                  value: 'Days since joining',
                  position: 'insideBottom',
                  offset: -2,
                  fill: '#6b7280',
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="completionPct"
                name="Completion"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip content={<VelocityTooltip />} />

              {trendLine && (
                <Scatter
                  data={trendLine}
                  dataKey="y"
                  line={{
                    stroke: '#6366f1',
                    strokeDasharray: '5 3',
                    strokeWidth: 1.5,
                  }}
                  shape={() => null}
                  legendType="none"
                />
              )}

              <Scatter data={velocityData} dataKey="completionPct">
                {velocityData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      DOT_COLORS[entry.status as keyof typeof DOT_COLORS] ??
                      '#6366f1'
                    }
                    fillOpacity={0.85}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-slate-400">
            No velocity data yet
          </div>
        )}
      </Card>

      {/* ── TOP PERFORMERS LEADERBOARD ── */}
      {filteredTop && filteredTop.length > 0 && (
        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-100">
            <Trophy className="h-4 w-4 text-amber-400" />
            Top Performers
          </p>
          <div className="space-y-3">
            {filteredTop.map((p, i) => {
              const rankColors = [
                'text-amber-400',
                'text-slate-300',
                'text-amber-600',
                'text-slate-400',
                'text-slate-400',
              ];
              const medals = ['🥇', '🥈', '🥉', '4th', '5th'];

              return (
                <motion.div
                  key={p.userId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-800/40 transition-colors"
                >
                  {/* Rank */}
                  <span
                    className={cn(
                      'text-lg font-bold w-8 text-center shrink-0',
                      rankColors[i],
                    )}
                  >
                    {medals[i]}
                  </span>

                  {/* Avatar */}
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={p.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs bg-indigo-500/20 text-indigo-300 font-bold">
                      {p.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name + dept */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {p.fullName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {p.department ?? p.jobTitle ?? '—'}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-5 text-right shrink-0">
                    <div>
                      <p className="text-sm font-bold tabular-nums text-slate-100">
                        {Math.round(p.completionPct)}%
                      </p>
                      <p className="text-xs text-slate-400">Complete</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold tabular-nums text-slate-100">
                        {p.timeSpentHours}h
                      </p>
                      <p className="text-xs text-slate-400">Spent</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold tabular-nums text-slate-100">
                        {p.exercisesPassed}
                      </p>
                      <p className="text-xs text-slate-400">Exercises ✓</p>
                    </div>
                    {p.streakDays > 0 && (
                      <div>
                        <p className="text-sm font-bold text-amber-400">
                          🔥{p.streakDays}d
                        </p>
                        <p className="text-xs text-slate-400">Streak</p>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-24 shrink-0 hidden xl:block">
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        style={{ width: `${p.completionPct}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── AT-RISK LEARNERS TABLE ── */}
      <Card className="p-5 border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold flex items-center gap-2 text-slate-100">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            At-Risk Learners
            {filteredAtRisk && filteredAtRisk.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                {filteredAtRisk.length}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-400">
            Joined 14+ days ago · low completion or 7+ days inactive
          </p>
        </div>

        {loadingRisk ? (
          <Skeleton className="h-32 w-full rounded-lg bg-slate-800" />
        ) : filteredAtRisk && filteredAtRisk.length > 0 ? (
          <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-900/40">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-800 bg-slate-900/80">
                  <TableHead className="text-slate-400">Employee</TableHead>
                  <TableHead className="text-slate-400">Department</TableHead>
                  <TableHead className="text-slate-400 text-center">
                    Completion
                  </TableHead>
                  <TableHead className="text-slate-400">Risk Reason</TableHead>
                  <TableHead className="text-slate-400 text-center">
                    Joined
                  </TableHead>
                  <TableHead className="text-slate-400 text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAtRisk.map((learner) => (
                  <TableRow
                    key={learner.userId}
                    className="border-slate-800 hover:bg-slate-800/40"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={learner.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs bg-amber-500/10 text-amber-400 font-bold">
                            {learner.fullName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {learner.fullName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {learner.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-400">
                        {learner.department ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="h-1.5 w-16 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{ width: `${learner.completionPct}%` }}
                          />
                        </div>
                        <span className="text-sm text-amber-400 font-medium tabular-nums w-8">
                          {Math.round(learner.completionPct)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        ⚠️ {learner.riskReason}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm text-slate-400">
                      {learner.joinedDaysAgo}d ago
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                          onClick={() => sendNudge.mutate(learner.userId)}
                          disabled={sendNudge.isPending}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Nudge
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-slate-300 hover:text-white"
                          onClick={() =>
                            router.push(`/manage/team/${learner.userId}`)
                          }
                        >
                          View →
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-400/40" />
            <p className="text-sm font-medium text-emerald-400">
              All learners on track! 🎉
            </p>
            <p className="text-xs text-slate-400">
              No employees with low progress or extended inactivity.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
