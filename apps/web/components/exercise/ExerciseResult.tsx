import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, MessageSquare, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExerciseDetail } from '@/hooks/learner/useExercise';
import { fireSuccessConfetti } from '@/lib/confetti';
import { MilestoneCompletionCheck } from './MilestoneCompletionCheck';

interface ExerciseResultProps {
  result: {
    status: string;
    score?: number | null;
    feedback?: string | null;
    instant?: boolean;
  };
  exercise: ExerciseDetail;
  onRetry: () => void;
  canRetry: boolean;
}

export function ExerciseResult({
  result,
  exercise,
  onRetry,
  canRetry,
}: ExerciseResultProps) {
  const passed =
    result.status === 'PASSED' ||
    (result.score !== undefined &&
      result.score !== null &&
      result.score >= exercise.passingScore);

  useEffect(() => {
    if (passed) {
      fireSuccessConfetti();
    }
  }, [passed]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      {/* Pass/Fail banner */}
      <Card
        className={cn(
          'p-5 text-center border',
          passed
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-rose-500/30 bg-rose-500/5',
        )}
      >
        <div className="text-4xl mb-2">{passed ? '🎉' : '📝'}</div>
        <h3 className="font-heading text-xl font-bold mb-1">
          {passed ? 'Excellent Work!' : 'Not quite there yet'}
        </h3>
        <p
          className={cn(
            'text-2xl font-bold',
            passed ? 'text-emerald-400' : 'text-rose-400',
          )}
        >
          {result.score ?? 0}%
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {passed
            ? `You passed! (Required: ${exercise.passingScore}%)`
            : `Required: ${exercise.passingScore}% to pass`}
        </p>
      </Card>

      {/* Feedback */}
      {result.feedback && (
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            {passed ? 'What you did well' : 'Feedback'}
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {result.feedback}
          </p>
        </Card>
      )}

      {/* Sample answer (show after passing or out of attempts) */}
      {exercise.sampleAnswer && (passed || !canRetry) && (
        <Card className="p-5 border-primary/20 bg-primary/5">
          <p className="text-xs text-primary uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Sample Excellent Answer
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {exercise.sampleAnswer}
          </p>
        </Card>
      )}

      {/* Tags (skills tested) */}
      {exercise.tags && exercise.tags.length > 0 && passed && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Skills demonstrated:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {exercise.tags.map((tag: string) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              >
                ✓ {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Retry button */}
      {canRetry && !passed && (
        <Button variant="outline" className="w-full" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}

      {/* Milestone completion check widget */}
      {passed && exercise.milestoneId && (
        <MilestoneCompletionCheck milestoneId={exercise.milestoneId} />
      )}
    </motion.div>
  );
}
