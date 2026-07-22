'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export interface MCQOption {
  label: string;
  text: string;
  isCorrect?: boolean;
  explanation?: string;
}

export interface ExerciseDetail {
  id: string;
  milestoneId: string;
  moduleId?: string | null;
  title: string;
  instructions: string;
  exerciseType: 'MULTIPLE_CHOICE' | 'WRITTEN' | 'SCENARIO';
  difficultyLevel?: string | null;
  estimatedMinutes: number;
  scenarioContext?: string | null;
  multipleChoiceOptions?: MCQOption[] | null;
  sampleAnswer?: string | null;
  hints: string[];
  passingScore: number;
  maxAttempts: number;
  tags: string[];
  isLocked: boolean;
}

export interface ExerciseSubmissionItem {
  id: string;
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'EVALUATED';
  score?: number | null;
  feedback?: string | null;
  attemptNumber: number;
  createdAt: string;
}

export interface ExerciseData {
  exercise: ExerciseDetail;
  submissions: ExerciseSubmissionItem[];
  latestSubmission: ExerciseSubmissionItem | null;
  hasPassed: boolean;
  attemptsUsed: number;
  attemptsRemaining: number;
  canAttempt: boolean;
}

export function useExercise(exerciseId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: ExerciseData }>(
        `/exercises/${exerciseId}`,
      );
      return res;
    },
    staleTime: 10_000,
    enabled: !!exerciseId,
    select: (res) => res.data,
  });
}
