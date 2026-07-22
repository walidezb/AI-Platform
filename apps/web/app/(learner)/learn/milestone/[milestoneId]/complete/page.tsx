'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle,
  Clock,
  LayoutDashboard,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils/format';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/ui/StatsCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useMilestoneSummary } from '@/hooks/learner/useMilestoneSummary';
import { CompletionSkeleton } from '@/components/learn/CompletionSkeleton';
import {
  fireMilestoneConfetti,
  firePathCompleteConfetti,
} from '@/lib/confetti';

export default function MilestoneCompletePage({
  params,
}: {
  params: Promise<{ milestoneId: string }> | { milestoneId: string };
}) {
  const resolvedParams = React.use(Promise.resolve(params));
  const { milestoneId } = resolvedParams;

  const router = useRouter();
  const { data, isLoading } = useMilestoneSummary(milestoneId);
  const hasConfettiFired = useRef(false);

  useEffect(() => {
    if (data && !hasConfettiFired.current) {
      hasConfettiFired.current = true;
      if (data.isPathComplete) {
        firePathCompleteConfetti();
      } else {
        fireMilestoneConfetti();
      }
    }
  }, [data]);

  if (isLoading) return <CompletionSkeleton />;
  if (!data) return null;

  const { milestone, stats, path, nextMilestone, isPathComplete } = data;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* ── HERO CELEBRATION CARD ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <Card
            className={cn(
              'p-8 text-center border-2',
              isPathComplete
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-emerald-500/40 bg-emerald-500/5',
            )}
          >
            {/* Trophy / Medal emoji */}
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.2, 1.1, 1.2, 1.1, 1],
              }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-6xl mb-4"
            >
              {isPathComplete ? '🏆' : '🎓'}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="font-heading text-2xl font-bold mb-2">
                {isPathComplete ? 'Path Complete! 🎉' : 'Milestone Complete!'}
              </h1>
              <p
                className={cn(
                  'text-lg font-semibold mb-1',
                  isPathComplete ? 'text-amber-400' : 'text-emerald-400',
                )}
              >
                {milestone.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {isPathComplete
                  ? `You've completed your entire learning path: "${path.title}"`
                  : `Milestone ${milestone.sequenceOrder} of ${path.totalMilestones} complete`}
              </p>
            </motion.div>
          </Card>
        </motion.div>

        {/* ── STATS GRID ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-3 gap-3"
        >
          <StatsCard
            icon={BookOpen}
            iconColor="text-blue-400"
            iconBg="bg-blue-500/10"
            label="Resources"
            value={`${stats.completedResources}/${stats.totalResources}`}
          />
          <StatsCard
            icon={Clock}
            iconColor="text-violet-400"
            iconBg="bg-violet-500/10"
            label="Time Spent"
            value={formatDuration(stats.timeSpentMinutes)}
          />
          <StatsCard
            icon={Target}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/10"
            label="Avg Score"
            value={
              stats.avgExerciseScore != null
                ? `${Math.round(stats.avgExerciseScore)}%`
                : '—'
            }
          />
        </motion.div>

        {/* ── LEARNING OBJECTIVES ACHIEVED ── */}
        {milestone.learningObjectives &&
          milestone.learningObjectives.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  Learning Objectives Achieved
                </p>
                <ul className="space-y-2">
                  {milestone.learningObjectives.map((obj, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.06 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{obj}</span>
                    </motion.li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          )}

        {/* ── EXERCISE SCORES ── */}
        {stats.exerciseResults && stats.exerciseResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Card className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">
                Exercise Results
              </p>
              <div className="space-y-3">
                {stats.exerciseResults.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full flex items-center',
                          'justify-center shrink-0',
                          ex.passed ? 'bg-emerald-500/15' : 'bg-rose-500/15',
                        )}
                      >
                        {ex.passed ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <X className="h-3 w-3 text-rose-400" />
                        )}
                      </div>
                      <span className="text-sm truncate max-w-[200px]">
                        {ex.title}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-sm font-bold',
                        ex.passed ? 'text-emerald-400' : 'text-rose-400',
                      )}
                    >
                      {ex.score != null ? `${Math.round(ex.score)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── PATH PROGRESS BAR ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Path Progress</span>
              <span className="text-sm font-bold text-primary">
                {path.completedMilestones}/{path.totalMilestones} milestones
              </span>
            </div>
            <ProgressBar
              value={(path.completedMilestones / path.totalMilestones) * 100}
              animated
              className="h-2.5"
            />
          </Card>
        </motion.div>

        {/* ── CTA BUTTONS ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="space-y-3"
        >
          {/* PATH COMPLETE */}
          {isPathComplete && (
            <>
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-glow-sm text-white"
                onClick={() => {
                  toast.info('🎓 Certificate coming soon!', {
                    description:
                      'Your completion certificate will be available in the next update.',
                  });
                }}
              >
                <Award className="h-4 w-4 mr-2" />
                Download Certificate (Coming Soon)
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => router.push('/learn/dashboard')}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </>
          )}

          {/* MILESTONE COMPLETE → NEXT MILESTONE */}
          {!isPathComplete && nextMilestone && (
            <>
              <Button
                size="lg"
                className="w-full bg-gradient-primary shadow-glow-sm"
                onClick={() => router.push(`/learn/path/${path.id}`)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Start Next Milestone: {nextMilestone.title}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => router.push('/learn/dashboard')}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Button>
            </>
          )}
        </motion.div>

        {/* ── SHARE ACHIEVEMENT ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center"
        >
          <p className="text-xs text-muted-foreground">
            {isPathComplete
              ? '🎉 Share your achievement with your team!'
              : `${path.totalMilestones - path.completedMilestones} milestone${
                  path.totalMilestones - path.completedMilestones !== 1
                    ? 's'
                    : ''
                } remaining in your learning path`}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
