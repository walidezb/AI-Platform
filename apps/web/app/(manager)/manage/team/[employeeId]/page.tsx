'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Brain,
  Map,
  Flag,
  Check,
  Lock,
  BarChart2,
  FileCheck,
  X,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api-client';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatDate, formatRelativeTime } from '@/lib/utils/date';
import { useEmployeeDetail } from '@/hooks/manager/useEmployeeDetail';
import { EmployeeDetailSkeleton } from '@/components/manager/EmployeeDetailSkeleton';

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data, isLoading } = useEmployeeDetail(resolvedParams.employeeId);

  if (isLoading) return <EmployeeDetailSkeleton />;

  const {
    user,
    assessment,
    path,
    progress,
    milestones,
    activityByDay,
    exerciseResults,
  } = data ?? {};

  const daysSinceActive = progress?.lastActivityAt
    ? Math.floor(
        (Date.now() - new Date(progress.lastActivityAt).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const isStalled =
    progress?.status === 'IN_PROGRESS' &&
    daysSinceActive !== null &&
    daysSinceActive >= 7;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/manage/team')}
        className="text-slate-400 hover:text-slate-100 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Team
      </Button>

      {/* ── HEADER ── */}
      <Card className="p-6 border-slate-800 bg-slate-900/60">
        <div className="flex items-start gap-5">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.avatarUrl ?? undefined} />
            <AvatarFallback className="text-xl bg-indigo-500/20 text-indigo-300 font-bold">
              {user?.fullName?.slice(0, 2).toUpperCase() ?? 'EM'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-heading font-bold text-slate-100">
                  {user?.fullName}
                </h1>
                <p className="text-sm text-slate-400">
                  {user?.jobTitle ?? user?.role}
                  {user?.department ? ` · ${user.department}` : ''}
                </p>
                <p className="text-sm text-slate-400 mt-0.5">{user?.email}</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Status badge */}
                {isStalled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Stalled — {daysSinceActive}d inactive
                  </span>
                ) : progress?.status === 'COMPLETED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-medium">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Path Complete
                  </span>
                ) : progress?.status === 'IN_PROGRESS' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-xs font-medium">
                    <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                    Active Learner
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-medium">
                    Not Started
                  </span>
                )}

                {/* Streak */}
                {(progress?.streakDays ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                    🔥 {progress?.streakDays}d streak
                  </span>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const targetId = prompt('Enter Milestone or Module ID to unlock:');
                    if (!targetId) return;
                    const reason = prompt('Reason for unlocking:') || 'Admin override';
                    try {
                      await apiPost('/paths/admin/unlock', {
                        userId: resolvedParams.employeeId,
                        targetId,
                        targetType: 'milestone',
                        reason,
                      });
                      toast.success('Unlocked successfully!');
                      window.location.reload();
                    } catch {
                      toast.error('Unlock failed. Ensure target ID is valid.');
                    }
                  }}
                  className="bg-slate-950 border-slate-800 text-amber-400 hover:text-amber-300 text-xs"
                >
                  <Unlock className="h-3.5 w-3.5 mr-1.5" />
                  Admin Unlock
                </Button>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="flex items-center gap-5 mt-4 flex-wrap pt-4 border-t border-slate-800">
              <div className="text-center">
                <p className="text-lg font-bold tabular-nums text-slate-100">
                  {Math.round(progress?.completionPct ?? 0)}%
                </p>
                <p className="text-xs text-slate-400">Complete</p>
              </div>
              <Separator orientation="vertical" className="h-8 bg-slate-800" />
              <div className="text-center">
                <p className="text-lg font-bold tabular-nums text-slate-100">
                  {progress?.timeSpentHours ?? 0}h
                </p>
                <p className="text-xs text-slate-400">Time Spent</p>
              </div>
              <Separator orientation="vertical" className="h-8 bg-slate-800" />
              <div className="text-center">
                <p className="text-lg font-bold tabular-nums text-slate-100">
                  {exerciseResults?.filter((e) => e.passed).length ?? 0}/
                  {exerciseResults?.length ?? 0}
                </p>
                <p className="text-xs text-slate-400">Exercises Passed</p>
              </div>
              <Separator orientation="vertical" className="h-8 bg-slate-800" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-200">
                  {progress?.lastActivityAt
                    ? formatRelativeTime(progress.lastActivityAt)
                    : 'Never'}
                </p>
                <p className="text-xs text-slate-400">Last Active</p>
              </div>
              {progress?.currentMilestone && (
                <>
                  <Separator orientation="vertical" className="h-8 bg-slate-800" />
                  <div>
                    <p className="text-sm font-medium text-slate-200 truncate max-w-[180px]">
                      {progress.currentMilestone}
                    </p>
                    <p className="text-xs text-slate-400">Current Milestone</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── SECTION 1 — Skill Profile ── */}
      {assessment && (
        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-100">
            <Brain className="h-4 w-4 text-indigo-400" />
            Skill Profile
            <span className="text-xs text-slate-400 font-normal ml-auto">
              Assessed {formatDate(assessment.completedAt!)}
            </span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Experience Level */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">
                Experience Level
              </p>
              <span
                className={cn(
                  'inline-flex items-center px-3 py-1.5 rounded-lg',
                  'text-sm font-semibold',
                  assessment.experienceLevel === 'ADVANCED'
                    ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                    : assessment.experienceLevel === 'INTERMEDIATE'
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                )}
              >
                {assessment.experienceLevel
                  ? assessment.experienceLevel.charAt(0) +
                    assessment.experienceLevel.slice(1).toLowerCase()
                  : 'N/A'}
              </span>
            </div>

            {/* Strong Areas */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">
                Strengths
              </p>
              <div className="flex flex-wrap gap-1.5">
                {assessment.strongAreas?.map((area: string) => (
                  <span
                    key={area}
                    className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Weak Areas */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">
                Areas to Grow
              </p>
              <div className="flex flex-wrap gap-1.5">
                {assessment.weakAreas?.map((area: string) => (
                  <span
                    key={area}
                    className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Learning goals */}
          {assessment.learningGoals?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">
                Learning Goals
              </p>
              <ul className="space-y-1">
                {assessment.learningGoals.map((g: string, i: number) => (
                  <li
                    key={i}
                    className="text-sm text-slate-300 flex items-start gap-2"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* ── SECTION 2 — Path Progress ── */}
      {path && progress && (
        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-100">
            <Map className="h-4 w-4 text-indigo-400" />
            Learning Path
          </p>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="font-medium text-slate-100">{path.title}</p>
              <p className="text-xs text-slate-400">
                {path.domain} · {path.totalMilestones} milestones · ~
                {path.estimatedHours}h total
              </p>
            </div>
            <span
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium',
                path.status === 'COMPLETED'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : path.status === 'ACTIVE'
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700',
              )}
            >
              {path.status}
            </span>
          </div>

          {/* Big progress bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Overall Progress</span>
              <span className="font-semibold text-slate-100">
                {Math.round(progress.completionPct)}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress.completionPct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* ── SECTION 3 — Milestone Timeline ── */}
      {milestones && milestones.length > 0 && (
        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-100">
            <Flag className="h-4 w-4 text-indigo-400" />
            Milestone Progress
          </p>
          <div className="space-y-0">
            {milestones.map((m, i) => {
              const isComplete = !!m.completedAt;
              const isCurrent =
                !isComplete &&
                !m.isLocked &&
                (m.modulesCompleted > 0 || i === 0);

              return (
                <div key={m.id} className="flex gap-4">
                  {/* Timeline connector */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center',
                        'border-2 shrink-0 z-10',
                        isComplete
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : isCurrent
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-800 bg-slate-900',
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <div className="h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-slate-500" />
                      )}
                    </div>
                    {i < milestones.length - 1 && (
                      <div
                        className={cn(
                          'w-0.5 flex-1 my-1',
                          isComplete ? 'bg-emerald-500/30' : 'bg-slate-800',
                        )}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className={cn(
                      'pb-5 flex-1',
                      i === milestones.length - 1 && 'pb-0',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className={cn(
                            'text-sm font-medium text-slate-200',
                            m.isLocked && 'text-slate-500',
                          )}
                        >
                          {m.sequenceOrder}. {m.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isComplete ? (
                            <span className="text-emerald-400">
                              ✓ Completed {formatDate(m.completedAt!)}
                            </span>
                          ) : isCurrent ? (
                            `${m.modulesCompleted}/${m.modulesTotal} modules done`
                          ) : m.isLocked ? (
                            'Locked'
                          ) : (
                            'Not started'
                          )}
                        </p>
                      </div>
                      {isComplete && (
                        <span className="text-xs text-slate-400 shrink-0">
                          ~{m.estimatedHours}h
                        </span>
                      )}
                    </div>

                    {/* Mini progress bar for in-progress milestones */}
                    {isCurrent && m.modulesTotal > 0 && (
                      <div className="mt-2 h-1 rounded-full bg-slate-800 overflow-hidden w-48">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{
                            width: `${(m.modulesCompleted / m.modulesTotal) * 100}%`,
                          }}
                        />
                      </div>
                    )}

                    {/* Exercise results for this milestone */}
                    {m.exercises.length > 0 && isComplete && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {m.exercises.map((ex) => (
                          <span
                            key={ex.exerciseId}
                            className={cn(
                              'inline-flex items-center gap-1 text-xs px-2 py-0.5',
                              'rounded-md border',
                              ex.passed
                                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                                : 'border-rose-500/20 bg-rose-500/5 text-rose-400',
                            )}
                          >
                            {ex.passed ? '✓' : '✗'} {ex.title}
                            {ex.score !== null && ` (${Math.round(ex.score)}%)`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── SECTION 4 — Activity Bar Chart ── */}
      {activityByDay && activityByDay.some((d) => d.minutes > 0) && (
        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-100">
            <BarChart2 className="h-4 w-4 text-indigo-400" />
            Daily Learning Activity — Last 30 Days
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={activityByDay}
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
                tick={{ fill: '#6b7280', fontSize: 10 }}
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
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickFormatter={(v) => `${v}m`}
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
                formatter={(value: any) => [`${value ?? 0} min`, 'Learning Time']}
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
              <Bar
                dataKey="minutes"
                fill="#6366f1"
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── SECTION 5 — Exercise Results Table ── */}
      {exerciseResults && exerciseResults.length > 0 && (
        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-100">
            <FileCheck className="h-4 w-4 text-indigo-400" />
            Exercise Results
          </p>
          <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-900/40">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-800 bg-slate-900/80">
                  <TableHead className="text-slate-400">Exercise</TableHead>
                  <TableHead className="text-slate-400">Type</TableHead>
                  <TableHead className="text-slate-400">Milestone</TableHead>
                  <TableHead className="text-slate-400 text-center">Score</TableHead>
                  <TableHead className="text-slate-400 text-center">Result</TableHead>
                  <TableHead className="text-slate-400 text-center">Attempts</TableHead>
                  <TableHead className="text-slate-400">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exerciseResults.map((ex) => (
                  <TableRow
                    key={ex.exerciseId}
                    className="border-slate-800 hover:bg-slate-800/50"
                  >
                    <TableCell className="font-medium text-sm text-slate-200">
                      {ex.title}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400">
                        {ex.exerciseType === 'MULTIPLE_CHOICE'
                          ? 'MCQ'
                          : ex.exerciseType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400 truncate max-w-[120px] block">
                        {ex.milestone}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {ex.score !== null ? (
                        <span
                          className={cn(
                            'text-sm font-semibold tabular-nums',
                            ex.score >= 80
                              ? 'text-emerald-400'
                              : ex.score >= 60
                              ? 'text-amber-400'
                              : 'text-rose-400',
                          )}
                        >
                          {Math.round(ex.score)}%
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {ex.status === 'NOT_ATTEMPTED' ? (
                        <span className="text-xs text-slate-400">Pending</span>
                      ) : ex.passed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <Check className="h-3 w-3" /> Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                          <X className="h-3 w-3" /> Failed
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums text-slate-300">
                      {ex.attempts > 0 ? ex.attempts : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {ex.submittedAt ? formatDate(ex.submittedAt) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
