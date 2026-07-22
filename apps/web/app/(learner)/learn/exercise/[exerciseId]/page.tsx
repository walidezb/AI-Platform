'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PenTool } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useExercise } from '@/hooks/learner/useExercise';
import { ExerciseHeader } from '@/components/exercise/ExerciseHeader';
import { ExerciseForm } from '@/components/exercise/ExerciseForm';
import { PassedState } from '@/components/exercise/PassedState';
import { OutOfAttemptsState } from '@/components/exercise/OutOfAttemptsState';
import { PreviousSubmissions } from '@/components/exercise/PreviousSubmissions';
import { ExerciseSkeleton } from '@/components/exercise/ExerciseSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

export default function ExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }> | { exerciseId: string };
}) {
  const resolvedParams = React.use(Promise.resolve(params));
  const { exerciseId } = resolvedParams;

  const { data, isLoading } = useExercise(exerciseId);
  const router = useRouter();
  const queryClient = useQueryClient();

  if (isLoading) return <ExerciseSkeleton />;
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={PenTool}
          title="Exercise Not Found"
          description="The requested exercise could not be found or you do not have permission to access it."
        />
      </div>
    );
  }

  const {
    exercise,
    hasPassed,
    attemptsUsed,
    attemptsRemaining,
    canAttempt,
    latestSubmission,
  } = data;

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['exercise', exerciseId] });
    queryClient.invalidateQueries({ queryKey: ['module'] });
    queryClient.invalidateQueries({ queryKey: ['learning-path'] });
    queryClient.invalidateQueries({ queryKey: ['learner-dashboard'] });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb / Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Learning
      </Button>

      {/* Header */}
      <ExerciseHeader
        exercise={exercise}
        hasPassed={hasPassed}
        attemptsUsed={attemptsUsed}
        attemptsRemaining={attemptsRemaining}
      />

      {/* Already passed */}
      {hasPassed && latestSubmission && (
        <PassedState
          submission={latestSubmission}
          exercise={exercise}
          onBack={() => router.back()}
        />
      )}

      {/* Can still attempt */}
      {!hasPassed && canAttempt && (
        <ExerciseForm
          exercise={exercise}
          attemptNumber={attemptsUsed + 1}
          exerciseId={exerciseId}
          onSuccess={handleSuccess}
        />
      )}

      {/* Out of attempts */}
      {!hasPassed && !canAttempt && (
        <OutOfAttemptsState
          exercise={exercise}
          latestSubmission={latestSubmission}
          onBack={() => router.back()}
        />
      )}

      {/* Previous submissions history */}
      {data.submissions && data.submissions.length > 0 && (
        <PreviousSubmissions submissions={data.submissions} />
      )}
    </div>
  );
}
