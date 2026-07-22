'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  TrendingUp,
  CheckCircle,
  Clock,
  Flame,
  AlertTriangle,
  Download,
  Activity,
  PieChart,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { StatCard } from '@/components/manager/StatCard';
import { EmployeeTable } from '@/components/manager/EmployeeTable';
import { useTeamOverview } from '@/hooks/manager/useTeamOverview';
import { useTeamStats } from '@/hooks/manager/useTeamStats';
import { useTeamTrends } from '@/hooks/manager/useTeamTrends';

export default function ManagerDashboard() {
  const router = useRouter();
  const { data, isLoading } = useTeamOverview();
  const { data: timeSeries } = useTeamStats(30);
  const { data: trendsData } = useTeamTrends();

  const stats = data?.stats;
  const employees = data?.employees ?? [];
  const trends = trendsData?.trends;

  const stalledCount = employees.filter((e) => e.isStalled).length;

  // Donut chart data
  const donutData = stats
    ? [
        { name: 'Not Started', value: stats.notStarted, fill: '#334155' },
        { name: 'In Progress', value: stats.active, fill: '#6366f1' },
        { name: 'Completed', value: stats.completed, fill: '#34d399' },
      ]
    : [];

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <PageHeader
        title="Team Dashboard"
        subtitle="Monitor your team's learning progress"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/api/manager/team/export')}
            className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      {/* Stalled learner alert banner */}
      {stalledCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4 border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-4 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  ⚠️ {stalledCount} employee
                  {stalledCount !== 1 ? 's have' : ' has'} been inactive for 7+ days
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {employees
                    .filter((e) => e.isStalled)
                    .slice(0, 3)
                    .map((e) => e.fullName)
                    .join(', ')}
                  {stalledCount > 3 ? ` and ${stalledCount - 3} more` : ''}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/30 text-amber-300 hover:bg-amber-500/20 shrink-0"
              onClick={() => router.push('/manage/team?status=stalled')}
            >
              View All →
            </Button>
          </Card>
        </motion.div>
      )}

      {/* ROW 1 — Stats cards (6 cards) */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="p-5 border-slate-800 bg-slate-900/60">
                <LoadingSkeleton className="h-16" />
              </Card>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Total Employees"
            value={stats?.total ?? 0}
            icon={<Users className="h-4.5 w-4.5" />}
            color="default"
          />
          <StatCard
            label="Active Learners"
            value={stats?.active ?? 0}
            icon={<BookOpen className="h-4.5 w-4.5" />}
            color="violet"
            trend={trends?.active}
          />
          <StatCard
            label="Avg Completion"
            value={stats?.avgCompletion ?? 0}
            icon={<TrendingUp className="h-4.5 w-4.5" />}
            suffix="%"
            color="emerald"
          />
          <StatCard
            label="Completed Paths"
            value={stats?.completed ?? 0}
            icon={<CheckCircle className="h-4.5 w-4.5" />}
            color="emerald"
          />
          <StatCard
            label="Total Hours Learned"
            value={stats?.totalHoursLearned ?? 0}
            icon={<Clock className="h-4.5 w-4.5" />}
            suffix="h"
            color="default"
            trend={trends?.totalHoursLearned}
          />
          <StatCard
            label="On Streak Today"
            value={stats?.onStreakToday ?? 0}
            icon={<Flame className="h-4.5 w-4.5" />}
            color="amber"
          />
        </div>
      )}

      {/* ROW 2 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Line chart — Daily Active Learners */}
        <Card className="lg:col-span-2 p-5 border-slate-800 bg-slate-900/60">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-100">
            <Activity className="h-4 w-4 text-indigo-400" />
            Daily Active Learners — Last 30 Days
          </p>
          {timeSeries && timeSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={timeSeries}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
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
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  name="Active Users"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366f1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-slate-500">
              No activity data yet
            </div>
          )}
        </Card>

        {/* Donut chart — Path Status Distribution */}
        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-100">
            <PieChart className="h-4 w-4 text-indigo-400" />
            Path Status
          </p>
          {donutData.some((d) => d.value > 0) ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <RechartsPieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="space-y-1.5 w-full mt-2">
                {donutData.map((d) => (
                  <div
                    key={d.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ background: d.fill }}
                      />
                      <span className="text-slate-400">{d.name}</span>
                    </span>
                    <span className="font-medium tabular-nums text-slate-200">
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-sm text-slate-500">
              No data yet
            </div>
          )}
        </Card>
      </div>

      {/* ROW 3 — Employee Table */}
      <Card className="p-5 border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold flex items-center gap-2 text-slate-100">
            <Users className="h-4 w-4 text-indigo-400" />
            Your Team ({employees.length})
          </p>
          <Button
            size="sm"
            onClick={() => router.push('/manage/team')}
            variant="ghost"
            className="text-xs text-slate-400 hover:text-slate-100"
          >
            View All →
          </Button>
        </div>
        {isLoading ? (
          <LoadingSkeleton className="h-64" />
        ) : (
          <EmployeeTable
            employees={employees}
            onViewEmployee={(id) => router.push(`/manage/team/${id}`)}
          />
        )}
      </Card>
    </div>
  );
}
