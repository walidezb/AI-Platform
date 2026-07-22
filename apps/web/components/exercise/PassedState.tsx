import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/utils/format';
import { ExerciseDetail, ExerciseSubmissionItem } from '@/hooks/learner/useExercise';

interface PassedStateProps {
  submission: ExerciseSubmissionItem;
  exercise: ExerciseDetail;
  onBack: () => void;
}

export function PassedState({
  submission,
  exercise,
  onBack,
}: PassedStateProps) {
  return (
    <div className="space-y-4">
      <Card className="p-6 text-center border-emerald-500/30 bg-emerald-500/5">
        <div className="text-5xl mb-3">🏆</div>
        <h3 className="font-heading text-xl font-bold text-emerald-400">
          Already Passed!
        </h3>
        <p className="text-muted-foreground text-sm mt-1">
          You scored {submission.score}% on attempt #{submission.attemptNumber}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelativeTime(submission.createdAt)}
        </p>
      </Card>

      {submission.feedback && (
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Your Feedback
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {submission.feedback}
          </p>
        </Card>
      )}

      {exercise.sampleAnswer && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <p className="text-xs text-primary uppercase tracking-wider mb-2">
            Sample Excellent Answer
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {exercise.sampleAnswer}
          </p>
        </Card>
      )}

      <Button className="w-full" variant="outline" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Continue Learning
      </Button>
    </div>
  );
}
