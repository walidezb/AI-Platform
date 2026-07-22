'use client';

import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { Briefcase, Lightbulb, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createApiClient } from '@/lib/api-client';
import { ExerciseDetail, MCQOption } from '@/hooks/learner/useExercise';
import { ExerciseResult } from './ExerciseResult';

interface ExerciseFormProps {
  exercise: ExerciseDetail;
  attemptNumber?: number;
  exerciseId: string;
  onSuccess?: () => void;
}

interface SubmissionResult {
  status: string;
  score?: number | null;
  feedback?: string | null;
  instant?: boolean;
  submissionId?: string;
}

export function ExerciseForm({
  exercise,
  exerciseId,
  onSuccess,
}: ExerciseFormProps) {
  const { getToken } = useAuth();
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelected] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [hintsRevealed, setRevealed] = useState(0);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const isMCQ = exercise.exerciseType === 'MULTIPLE_CHOICE';
  const isWritten = exercise.exerciseType === 'WRITTEN';
  const isScenario = exercise.exerciseType === 'SCENARIO';

  const handleSubmit = async () => {
    const submission = isMCQ ? selectedOption! : answer.trim();
    if (!submission) return;

    setSubmitting(true);
    try {
      const client = createApiClient(getToken);
      const res = await client.post<{ success: boolean; data: SubmissionResult }>(
        `/exercises/${exerciseId}/submit`,
        { submissionText: submission },
      );
      const data = res.data;

      if (data.instant) {
        // MCQ: instant result
        setResult(data);
        onSuccess?.();
      } else if (data.submissionId) {
        // AI evaluation: poll for result
        setIsPending(true);
        pollForResult(data.submissionId);
      }
    } catch {
      toast.error('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const pollForResult = async (submissionId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 × 2s = 60s max

    const poll = async () => {
      if (attempts++ >= maxAttempts) {
        setIsPending(false);
        toast.warning('Evaluation taking longer than expected', {
          description: 'Check back in a moment.',
        });
        return;
      }

      try {
        const client = createApiClient(getToken);
        const res = await client.get<{
          success: boolean;
          data: { status: string; score?: number; feedback?: string };
        }>(`/exercises/submissions/${submissionId}`);
        const sub = res.data;

        if (sub.status !== 'PENDING') {
          setIsPending(false);
          setResult({
            status: sub.status,
            score: sub.score,
            feedback: sub.feedback,
            instant: false,
          });
          onSuccess?.();
          return;
        }

        setTimeout(poll, 2000);
      } catch {
        setTimeout(poll, 2000);
      }
    };

    setTimeout(poll, 2000);
  };

  return (
    <div className="space-y-5">
      {/* Scenario context */}
      {isScenario && exercise.scenarioContext && (
        <Card className="p-5 border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Your Scenario
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {exercise.scenarioContext}
          </p>
        </Card>
      )}

      {/* Instructions */}
      <Card className="p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">
          Instructions
        </p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {exercise.instructions}
        </p>
      </Card>

      {/* ── MCQ OPTIONS ── */}
      {isMCQ && exercise.multipleChoiceOptions && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Select one answer:
          </p>
          {exercise.multipleChoiceOptions.map((opt: MCQOption) => (
            <button
              key={opt.label}
              onClick={() => setSelected(opt.label)}
              disabled={!!result}
              className={cn(
                'w-full text-left flex items-start gap-3 p-4',
                'rounded-xl border transition-all duration-150',
                selectedOption === opt.label && !result
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-secondary/30',
                // After submission with result:
                result &&
                  opt.label === selectedOption &&
                  result.status === 'PASSED' &&
                  'border-emerald-500/40 bg-emerald-500/5',
                result &&
                  opt.label === selectedOption &&
                  result.status === 'FAILED' &&
                  'border-rose-500/40 bg-rose-500/5',
              )}
            >
              <span
                className={cn(
                  'h-6 w-6 rounded-full border-2 flex items-center',
                  'justify-center text-xs font-bold shrink-0 mt-0.5',
                  selectedOption === opt.label && !result
                    ? 'border-primary text-primary'
                    : 'border-border text-muted-foreground',
                )}
              >
                {opt.label}
              </span>
              <span className="text-sm leading-relaxed">{opt.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── WRITTEN / SCENARIO TEXTAREA ── */}
      {(isWritten || isScenario) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Your answer:
            </p>
            <span
              className={cn(
                'text-xs',
                answer.length < 50
                  ? 'text-rose-400'
                  : 'text-muted-foreground',
              )}
            >
              {answer.length} characters
              {answer.length < 50 && ' (min 50)'}
            </span>
          </div>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={
              isScenario
                ? 'Describe your approach to this scenario, the steps you would take, and the reasoning behind your decisions...'
                : 'Write your answer here. Be specific and use examples from the module content...'
            }
            className="min-h-[220px] text-sm leading-relaxed resize-y"
            disabled={!!result || isPending}
          />
        </div>
      )}

      {/* ── HINTS ── */}
      {!result && exercise.hints && exercise.hints.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowHints(true);
              setRevealed((r) => Math.min(r + 1, exercise.hints.length));
            }}
            className="text-xs text-muted-foreground"
          >
            <Lightbulb className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
            {!showHints
              ? 'Show a hint'
              : hintsRevealed < exercise.hints.length
                ? 'Show another hint'
                : 'No more hints'}
          </Button>

          {showHints && hintsRevealed > 0 && (
            <div className="mt-2 space-y-2">
              {exercise.hints
                .slice(0, hintsRevealed)
                .map((hint: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground bg-amber-500/5 border border-amber-500/15 rounded-lg p-3"
                  >
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    {hint}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── SUBMIT BUTTON ── */}
      {!result && !isPending && (
        <Button
          size="lg"
          className="w-full bg-gradient-primary"
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            (isMCQ && !selectedOption) ||
            (!isMCQ && answer.trim().length < 50)
          }
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Submit Answer
          {!isMCQ && answer.trim().length > 0 && answer.trim().length < 50 && (
            <span className="ml-2 text-xs opacity-70">
              (need {50 - answer.trim().length} more chars)
            </span>
          )}
        </Button>
      )}

      {/* ── AI EVALUATION PENDING ── */}
      {isPending && (
        <Card className="p-6 text-center glass">
          <div className="flex justify-center gap-2 mb-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="font-medium">AI is evaluating your submission...</p>
          <p className="text-sm text-muted-foreground mt-1">
            Usually ready in 15–30 seconds
          </p>
        </Card>
      )}

      {/* ── INSTANT RESULT (MCQ) ── */}
      {result && result.instant && (
        <ExerciseResult
          result={result}
          exercise={exercise}
          onRetry={() => {
            setResult(null);
            setSelected(null);
          }}
          canRetry={result.status !== 'PASSED'}
        />
      )}

      {/* ── AI RESULT (WRITTEN / SCENARIO) ── */}
      {result && !result.instant && (
        <ExerciseResult
          result={result}
          exercise={exercise}
          onRetry={() => {
            setResult(null);
            setAnswer('');
          }}
          canRetry={result.status !== 'PASSED'}
        />
      )}
    </div>
  );
}
