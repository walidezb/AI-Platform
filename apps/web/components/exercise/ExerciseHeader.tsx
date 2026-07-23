'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, Clock, HelpCircle, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';
import { ExerciseDetail } from '@/hooks/learner/useExercise';

interface ExerciseHeaderProps {
  exercise: ExerciseDetail;
  hasPassed: boolean;
  attemptsUsed: number;
  attemptsRemaining: number;
}

export function ExerciseHeader({
  exercise,
  hasPassed,
  attemptsUsed,
  attemptsRemaining,
}: ExerciseHeaderProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const TYPE_CONFIG: Record<
    string,
    { label: string; icon: React.ReactNode; color: string; bg: string }
  > = {
    MULTIPLE_CHOICE: {
      label: 'Multiple Choice',
      icon: <HelpCircle className="h-4 w-4" />,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
    WRITTEN: {
      label: 'Written Exercise',
      icon: <PenTool className="h-4 w-4" />,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    SCENARIO: {
      label: 'Scenario Exercise',
      icon: <Briefcase className="h-4 w-4" />,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
  };
  const config = TYPE_CONFIG[exercise.exerciseType] || TYPE_CONFIG.WRITTEN;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-medium',
            'px-2.5 py-1 rounded-full border border-current/20',
            config.color,
            config.bg,
          )}
        >
          {config.icon}
          {config.label}
        </span>

        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          ~{exercise.estimatedMinutes} min
        </span>

        {exercise.difficultyLevel && (
          <DifficultyBadge level={exercise.difficultyLevel} />
        )}

        {hasPassed && (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
            ✅ Passed
          </Badge>
        )}

        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground bg-muted/60 border border-border/50 rounded px-2.5 py-1 ml-auto">
          <Clock className="h-3 w-3 text-indigo-400" />
          {formatElapsed(elapsed)}
        </div>
      </div>

      <h1 className="font-heading text-2xl font-bold">{exercise.title}</h1>

      {/* Attempts indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="flex gap-1">
          {Array.from({ length: exercise.maxAttempts }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 w-2 rounded-full',
                i < attemptsUsed
                  ? hasPassed
                    ? 'bg-emerald-400'
                    : 'bg-rose-400'
                  : 'bg-secondary border border-border',
              )}
            />
          ))}
        </div>
        <span>
          {hasPassed
            ? 'Passed!'
            : attemptsRemaining > 0
              ? `${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining`
              : 'No attempts remaining'}
        </span>
      </div>
    </div>
  );
}
