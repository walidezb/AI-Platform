'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createApiClient } from '@/lib/api-client';
import { useExercise } from '@/hooks/learner/useExercise';
import { ScoreDisplay } from '@/components/exercise/ScoreDisplay';
import { FeedbackCard } from '@/components/exercise/FeedbackCard';
import { McqBreakdown } from '@/components/exercise/McqBreakdown';
import { SuggestedResources } from '@/components/exercise/SuggestedResources';
import { fireSuccessConfetti } from '@/lib/confetti';

export default function ExerciseResultPage({
  params,
}: {
  params: Promise<{ exerciseId: string }> | { exerciseId: string };
}) {
  const resolvedParams = React.use(Promise.resolve(params));
  const { exerciseId } = resolvedParams;

  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('submissionId');
  const { getToken } = useAuth();

  // Poll submission until not PENDING
  const { data: submission } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{
        success: boolean;
        data: {
          id: string;
          status: string;
          score: number | null;
          feedback: string | null;
          submissionText: string;
          attemptNumber: number;
          createdAt: string;
        };
      }>(`/exercises/submissions/${submissionId}`);
      return res;
    },
    refetchInterval: (query) =>
      query.state.data?.data?.status === 'PENDING' ? 2000 : false,
    enabled: !!submissionId,
    select: (res) => res.data,
  });

  const { data: exerciseData } = useExercise(exerciseId);
  const exercise = exerciseData?.exercise;

  const hasFired = useRef(false);
  useEffect(() => {
    if (submission?.status === 'PASSED' && !hasFired.current) {
      hasFired.current = true;
      fireSuccessConfetti();
    }
  }, [submission?.status]);

  const [pollCount, setPollCount] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (submission?.status === 'PENDING') {
      const interval = setInterval(() => {
        setPollCount((prev) => {
          if (prev >= 60) {
            setTimedOut(true);
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [submission?.status]);

  if (timedOut) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="rounded-full bg-amber-500/10 p-4 border border-amber-500/20">
          <RefreshCw className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="font-heading text-lg font-semibold">
          Evaluation is taking longer than expected
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your submission was saved. Refresh this page in a few minutes to see your results, or try submitting again.
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
          <Button onClick={() => router.push(`/learn/exercise/${exerciseId}`)}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ── PENDING STATE ──
  if (!submission || submission.status === 'PENDING') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <Card className="p-8 glass">
            <div className="flex justify-center gap-2 mb-5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-3 w-3 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <h2 className="font-heading text-xl font-bold mb-2">
              AI is reviewing your submission
            </h2>
            <p className="text-sm text-muted-foreground">
              Evaluating against the rubric criteria...
              <br />
              Usually ready in 15–30 seconds.
            </p>
          </Card>
          <p className="text-xs text-muted-foreground animate-pulse">
            Please don&apos;t close this tab
          </p>
        </div>
      </div>
    );
  }

  const passed = submission.status === 'PASSED';
  const score = submission.score ?? 0;
  const passingScore = exercise?.passingScore ?? 70;
  const isMCQ = exercise?.exerciseType === 'MULTIPLE_CHOICE';

  // Parse stored MCQ answers from submission text
  let userAnswers: Record<number, string> = {};
  try {
    userAnswers = JSON.parse(submission.submissionText ?? '{}');
  } catch {
    /* single letter answer = old format */
    if (submission.submissionText) {
      userAnswers = { 0: submission.submissionText };
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/learn/exercise/${exerciseId}`)}
        className="text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Exercise
      </Button>

      {/* ── HERO RESULT CARD ── */}
      <Card
        className={cn(
          'p-8 text-center border-2',
          passed
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-rose-500/30 bg-rose-500/5',
        )}
      >
        <div className="flex justify-center mb-4">
          {/* Circular score ring */}
          <ScoreDisplay score={score} size={140} passing={passingScore} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="font-heading text-2xl font-bold mb-1">
            {passed ? '🎉 Excellent Work!' : '📝 Not Quite There Yet'}
          </h1>
          <p
            className={cn(
              'text-sm font-medium',
              passed ? 'text-emerald-400' : 'text-rose-400',
            )}
          >
            {passed
              ? `You passed! (Required: ${passingScore}%)`
              : `Required ${passingScore}% to pass`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Attempt #{submission.attemptNumber} ·{' '}
            {formatRelativeTime(submission.createdAt)}
          </p>
        </motion.div>
      </Card>

      {/* ── FEEDBACK CARD ── */}
      {submission.feedback && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <FeedbackCard feedback={submission.feedback} />
        </motion.div>
      )}

      {/* ── MCQ QUESTION BREAKDOWN ── */}
      {isMCQ && exercise?.multipleChoiceOptions && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <McqBreakdown
            options={exercise.multipleChoiceOptions}
            userAnswers={userAnswers}
          />
        </motion.div>
      )}

      {/* ── FAILED: SUGGESTED RESOURCES ── */}
      {!passed && exercise?.milestoneId && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <SuggestedResources milestoneId={exercise.milestoneId} />
        </motion.div>
      )}

      {/* ── SAMPLE ANSWER (visible after pass or no retries) ── */}
      {exercise?.sampleAnswer &&
        (passed || submission.attemptNumber >= exercise.maxAttempts) && (
          <Card className="p-5 border-primary/20 bg-primary/5">
            <p className="text-xs text-primary uppercase tracking-wider font-semibold mb-3">
              Sample Excellent Answer
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {exercise.sampleAnswer}
            </p>
          </Card>
        )}

      {/* ── CTA BUTTONS ── */}
      <div className="space-y-3">
        {passed ? (
          <Button
            size="lg"
            className="w-full bg-gradient-primary shadow-glow-sm"
            onClick={() => router.back()}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Continue Learning
          </Button>
        ) : submission.attemptNumber < (exercise?.maxAttempts ?? 3) ? (
          <>
            <Button
              size="lg"
              className="w-full bg-gradient-primary"
              onClick={() => router.push(`/learn/exercise/${exerciseId}`)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again ({(exercise?.maxAttempts ?? 3) - submission.attemptNumber}{' '}
              attempt
              {(exercise?.maxAttempts ?? 3) - submission.attemptNumber !== 1
                ? 's'
                : ''}{' '}
              remaining)
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => router.back()}
            >
              Review Resources First
            </Button>
          </>
        ) : (
          <Card className="p-4 text-center border-rose-500/20 bg-rose-500/5">
            <p className="text-sm text-muted-foreground">
              No attempts remaining. Contact your manager if you need assistance.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => router.push('/learn/dashboard')}
            >
              Return to Dashboard
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
