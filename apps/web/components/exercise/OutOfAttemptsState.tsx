import React from 'react';
import { ArrowLeft, BookOpen, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExerciseDetail, ExerciseSubmissionItem } from '@/hooks/learner/useExercise';

interface OutOfAttemptsStateProps {
  exercise: ExerciseDetail;
  latestSubmission: ExerciseSubmissionItem | null;
  onBack: () => void;
}

export function OutOfAttemptsState({
  exercise,
  latestSubmission,
  onBack,
}: OutOfAttemptsStateProps) {
  return (
    <div className="space-y-4">
      <Card className="p-6 text-center border-rose-500/30 bg-rose-500/5">
        <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
        <h3 className="font-heading text-xl font-bold text-rose-400">
          No Attempts Remaining
        </h3>
        <p className="text-muted-foreground text-sm mt-1">
          You have used all {exercise.maxAttempts} attempts for this exercise.
        </p>
      </Card>

      {latestSubmission?.feedback && (
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Latest Attempt Feedback
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {latestSubmission.feedback}
          </p>
        </Card>
      )}

      {exercise.sampleAnswer && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <p className="text-xs text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Sample Excellent Answer
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {exercise.sampleAnswer}
          </p>
        </Card>
      )}

      <Button className="w-full" variant="outline" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Module
      </Button>
    </div>
  );
}
