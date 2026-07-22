'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Lock,
  Map,
  Play,
  RefreshCw,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { useDashboard, useResume } from '@/hooks/learner/useDashboard';
import { DashboardSkeleton } from '@/components/learn/DashboardSkeleton';
import { ActivityHeatmap } from '@/components/learn/ActivityHeatmap';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatsCard } from '@/components/ui/StatsCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getGreeting } from '@/lib/utils/greeting';
import { formatDuration, formatRelativeTime } from '@/lib/utils/format';
import { getModuleTypeIcon } from '@/lib/utils/module-icons';
import { QUOTES } from '@/lib/constants/quotes';

export default function LearnerDashboardPage() {
  const { data, isLoading } = useDashboard();
  const { data: resume } = useResume();
  const router = useRouter();
  const { user } = useUser();

  const greeting = getGreeting();
  const firstName = user?.firstName || 'there';
  const todaysQuote = QUOTES[new Date().getDay() % QUOTES.length];

  if (isLoading) return <DashboardSkeleton />;

  const { progress, path, currentMilestone, nextModule, recentActivity } =
    data ?? {};

  // No path yet
  if (!path) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={Map}
          title="Your learning path is being prepared"
          description="Our AI is building your personalized curriculum. This usually takes under a minute."
          action={
            <Button onClick={() => router.refresh()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Again
            </Button>
          }
        />
      </div>
    );
  }

  // Calculate completed milestones count
  const completedMilestones =
    path.milestones.filter((m) => m.completedAt !== null).length;

  // Calculate completed modules in current milestone
  const completedInMilestone = currentMilestone
    ? currentMilestone.modules.filter((m) => m.isLocked === false).length
    : 0;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* ── SECTION A: WELCOME HEADER ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {progress?.status === 'NOT_STARTED'
              ? 'Ready to start your learning journey?'
              : "Keep the momentum going — you're doing great!"}
          </p>
        </div>

        {/* Streak counter */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl border',
            'bg-amber-500/10 border-amber-500/20',
          )}
        >
          <span className="text-2xl">🔥</span>
          <div className="text-right">
            <p className="font-bold text-amber-400 text-lg leading-none">
              {progress?.streakDays ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
        </motion.div>
      </div>

      {/* ── SECTION B: 4 STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={TrendingUp}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          label="Path Complete"
          value={`${Math.round(progress?.overallCompletionPct ?? 0)}%`}
          subValue={
            <ProgressBar
              value={progress?.overallCompletionPct ?? 0}
              className="mt-2 h-1"
              variant="success"
            />
          }
        />
        <StatsCard
          icon={Clock}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
          label="Time Invested"
          value={formatDuration(progress?.timeSpentMinutes ?? 0)}
          subValue="total learning time"
        />
        <StatsCard
          icon={Map}
          iconColor="text-violet-400"
          iconBg="bg-violet-500/10"
          label="Milestones"
          value={`${completedMilestones} / ${path.totalMilestones}`}
          subValue="completed"
        />
        <StatsCard
          icon={BookOpen}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          label="Estimated"
          value={`~${path.estimatedHours}h`}
          subValue="total path length"
        />
      </div>

      {/* ── SECTION C: CONTINUE LEARNING (main CTA) ── */}
      {nextModule && currentMilestone && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="gradient-border p-6 bg-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  Continue Learning
                </p>
                <h2 className="font-heading text-xl font-bold">
                  {currentMilestone.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {currentMilestone.description}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 ml-4">
                Milestone {currentMilestone.sequenceOrder}
              </Badge>
            </div>

            {/* Milestone progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Milestone progress</span>
                <span>
                  {completedInMilestone}/{currentMilestone.modules.length} modules
                </span>
              </div>
              <ProgressBar
                value={
                  currentMilestone.modules.length > 0
                    ? (completedInMilestone / currentMilestone.modules.length) * 100
                    : 0
                }
                animated
              />
            </div>

            {/* Next module preview */}
            <div className="bg-secondary/50 rounded-xl p-3 mb-5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {getModuleTypeIcon(nextModule.moduleType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {nextModule.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  ~{nextModule.estimatedMinutes} min · {nextModule.moduleType}
                </p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                Up next
              </Badge>
            </div>

            <Button
              size="lg"
              className="w-full bg-gradient-primary shadow-glow-sm"
              onClick={() => {
                if (resume?.redirectUrl) {
                  router.push(resume.redirectUrl);
                } else if (nextModule) {
                  router.push(`/learn/module/${nextModule.id}`);
                }
              }}
            >
              <Play className="h-4 w-4 mr-2" />
              {resume?.currentModule?.title
                ? `Continue: ${resume.currentModule.title}`
                : 'Continue Learning →'}
            </Button>
            {resume?.currentModule && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                {resume.currentModule.milestone?.title}
                {' · '}~{resume.currentModule.estimatedMinutes}min
              </p>
            )}
          </Card>
        </motion.div>
      )}

      {/* No next module — path complete or not started */}
      {!nextModule && progress?.status === 'COMPLETED' && (
        <Card className="p-8 text-center border-emerald-500/20 bg-emerald-500/5">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="font-heading text-2xl font-bold mb-2">
            Path Complete!
          </h2>
          <p className="text-muted-foreground">
            You&apos;ve completed your entire learning path. Your certificate is ready to download.
          </p>
        </Card>
      )}

      {/* ── SECTION D: MILESTONE OVERVIEW ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-base">Learning Path Overview</h2>
          <Link
            href={`/learn/path/${path.id}`}
            className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            View Full Path →
          </Link>
        </div>

        <div className="space-y-2">
          {path.milestones.map((milestone, i) => {
            const isCompleted = !!milestone.completedAt;
            const isCurrent = milestone.id === currentMilestone?.id;
            const isLocked = milestone.isLocked;

            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-xl border',
                  'transition-all duration-200 cursor-pointer',
                  isCurrent && 'border-primary/30 bg-primary/5',
                  isCompleted && 'border-emerald-500/20 bg-emerald-500/5',
                  isLocked && 'opacity-50 cursor-not-allowed border-border',
                  !isLocked &&
                    !isCurrent &&
                    !isCompleted &&
                    'border-border hover:border-primary/20 hover:bg-secondary/30',
                )}
                onClick={() => {
                  if (!isLocked) router.push(`/learn/path/${path.id}`);
                }}
              >
                {/* Status indicator */}
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center',
                    'justify-center shrink-0 text-sm font-bold',
                    isCompleted && 'bg-emerald-500/15 text-emerald-400',
                    isCurrent && 'bg-primary/15 text-primary',
                    isLocked && 'bg-secondary text-muted-foreground',
                    !isLocked &&
                      !isCurrent &&
                      !isCompleted &&
                      'bg-secondary text-muted-foreground',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : isCurrent ? (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                  ) : isLocked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    i + 1
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {milestone.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {milestone.modules.length} modules · ~{milestone.estimatedHours}h
                  </p>
                </div>

                {isCompleted && <StatusBadge status="completed" />}
                {isCurrent && <StatusBadge status="in-progress" />}
                {!isLocked && !isCurrent && !isCompleted && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION D.5: ACTIVITY HEATMAP ── */}
      {data?.activityByDate && Object.keys(data.activityByDate).length > 0 && (
        <Card className="p-5">
          <ActivityHeatmap activityByDate={data.activityByDate} />
        </Card>
      )}

      {/* ── SECTION E: RECENT ACTIVITY ── */}
      {recentActivity && recentActivity.length > 0 && (
        <div>
          <h2 className="font-semibold text-base mb-3">Recent Activity</h2>
          <div className="space-y-2">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span className="flex-1 truncate">
                  Completed: {item.resource.title}
                </span>
                <span className="text-xs shrink-0">
                  {formatRelativeTime(item.completedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION F: DAILY QUOTE ── */}
      <Card className="glass p-5 text-center">
        <p className="text-sm italic text-muted-foreground mb-1.5">
          &quot;{todaysQuote.text}&quot;
        </p>
        <p className="text-xs text-primary font-medium">
          — {todaysQuote.author}
        </p>
      </Card>
    </div>
  );
}
