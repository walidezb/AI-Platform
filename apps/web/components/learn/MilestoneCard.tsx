'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Check, ChevronDown, Lock, PenTool, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ModuleListItem } from './ModuleListItem';
import { EnrichedMilestone } from '@/hooks/learner/useLearningPath';

type MilestoneStatus = 'locked' | 'in-progress' | 'completed';

interface MilestoneCardProps {
  milestone: EnrichedMilestone;
  index: number;
  onContinue: (moduleId: string) => void;
  onReview: (moduleId: string) => void;
}

export function MilestoneCard({
  milestone,
  index,
  onContinue,
  onReview,
}: MilestoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(
    !milestone.isLocked && !milestone.completedAt, // auto-open current
  );

  const status: MilestoneStatus = milestone.completedAt
    ? 'completed'
    : milestone.isLocked
      ? 'locked'
      : 'in-progress';

  const nextIncompleteModule = milestone.modules.find(
    (m) => !m.isComplete && !m.isLocked,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="relative pl-14" // space for the timeline dot
    >
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute left-0 top-5 h-12 w-12 rounded-full',
          'flex items-center justify-center border-2 z-10',
          'transition-all duration-300',
          status === 'completed' &&
            'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
          status === 'in-progress' &&
            'bg-primary/15 border-primary/60 text-primary',
          status === 'locked' &&
            'bg-secondary border-border text-muted-foreground',
        )}
      >
        {status === 'completed' && <Check className="h-5 w-5" />}
        {status === 'in-progress' && (
          <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
        )}
        {status === 'locked' && <Lock className="h-4 w-4" />}
      </div>

      {/* Card */}
      <Card
        className={cn(
          'transition-all duration-200',
          status === 'completed' && 'border-emerald-500/20 bg-emerald-500/5',
          status === 'in-progress' && 'border-primary/30 bg-primary/5',
          status === 'locked' && 'opacity-60',
        )}
      >
        {/* Card Header */}
        <div
          className={cn(
            'flex items-start gap-3 p-4',
            status !== 'locked' && 'cursor-pointer select-none',
          )}
          onClick={() => status !== 'locked' && setIsExpanded((e) => !e)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs text-muted-foreground">
                Milestone {milestone.sequenceOrder}
              </span>
              {status === 'completed' && <StatusBadge status="completed" />}
              {status === 'in-progress' && <StatusBadge status="in-progress" />}
              {status === 'locked' && (
                <Badge variant="secondary" className="text-xs">
                  Locked
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-base leading-snug">
              {milestone.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {milestone.description}
            </p>

            {/* Learning objectives (collapsed preview) */}
            {!isExpanded && status !== 'locked' && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {milestone.learningObjectives
                  .slice(0, 2)
                  .map((obj, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                    >
                      {obj}
                    </span>
                  ))}
                {milestone.learningObjectives.length > 2 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    +{milestone.learningObjectives.length - 2} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Progress + chevron */}
          <div className="flex items-center gap-3 shrink-0">
            {status !== 'locked' && (
              <div className="text-right">
                <p className="text-sm font-bold">
                  {milestone.completedModules}/{milestone.totalModules}
                </p>
                <p className="text-xs text-muted-foreground">modules</p>
              </div>
            )}
            {status !== 'locked' && (
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  isExpanded && 'rotate-180',
                )}
              />
            )}
          </div>
        </div>

        {/* Milestone progress bar */}
        {status === 'in-progress' && (
          <div className="px-4 pb-3">
            <ProgressBar
              value={milestone.milestoneCompletionPct}
              label={`${milestone.milestoneCompletionPct}% complete`}
              className="h-1.5"
            />
          </div>
        )}

        {/* ── EXPANDED: MODULE LIST ── */}
        <AnimatePresence>
          {isExpanded && status !== 'locked' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border px-4 pb-4 pt-3 space-y-1">
                {/* Module list */}
                {milestone.modules.map((module) => (
                  <ModuleListItem
                    key={module.id}
                    module={module}
                    onClick={() => {
                      if (!module.isLocked) onContinue(module.id);
                    }}
                  />
                ))}

                {/* Exercises */}
                {milestone.exercises && milestone.exercises.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      Exercises
                    </p>
                    {milestone.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center gap-3 py-2 px-3 rounded-lg text-sm text-muted-foreground"
                      >
                        <PenTool className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="flex-1 truncate">{ex.title}</span>
                        {ex.estimatedMinutes && (
                          <span className="text-xs">
                            ~{ex.estimatedMinutes}min
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA button */}
                <div className="pt-3">
                  {status === 'in-progress' && nextIncompleteModule && (
                    <Button
                      size="sm"
                      className="w-full bg-gradient-primary"
                      onClick={() => onContinue(nextIncompleteModule.id)}
                    >
                      <Play className="h-3.5 w-3.5 mr-2" />
                      Continue: {nextIncompleteModule.title}
                    </Button>
                  )}
                  {status === 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        onReview(milestone.modules[0]?.id || '')
                      }
                    >
                      <BookOpen className="h-3.5 w-3.5 mr-2" />
                      Review Milestone
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LOCKED: message */}
        {status === 'locked' && (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Complete the previous milestone to unlock
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
