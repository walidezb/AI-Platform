'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export interface McqOptionItem {
  label: string;
  text: string;
  isCorrect?: boolean;
  explanation?: string;
}

export interface McqQuestionItem {
  question?: string;
  text?: string;
  options: McqOptionItem[];
}

export function McqBreakdown({
  questions,
  options,
  userAnswers,
}: {
  questions?: McqQuestionItem[];
  options?: McqOptionItem[];
  userAnswers: Record<number, string> | string;
}) {
  const items: McqQuestionItem[] =
    questions ?? (options ? [{ question: 'Multiple Choice Question', options }] : []);
  const answersMap: Record<number, string> =
    typeof userAnswers === 'string' ? { 0: userAnswers } : userAnswers;

  return (
    <Card className="p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">
        Question Breakdown
      </p>
      <div className="space-y-4">
        {items.map((q: McqQuestionItem, i: number) => {
          const selected = answersMap[i] ?? answersMap[0];
          const correct = q.options?.find((o: McqOptionItem) => o.isCorrect);
          const isCorrect = selected === correct?.label;

          return (
            <div
              key={i}
              className={cn(
                'rounded-lg p-3 border',
                isCorrect
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-rose-500/20 bg-rose-500/5',
              )}
            >
              <div className="flex items-start gap-2 mb-2">
                <div
                  className={cn(
                    'h-5 w-5 rounded-full flex items-center justify-center shrink-0',
                    isCorrect ? 'bg-emerald-500/15' : 'bg-rose-500/15',
                  )}
                >
                  {isCorrect ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <X className="h-3 w-3 text-rose-400" />
                  )}
                </div>
                <p className="text-sm font-medium">
                  {q.question ? `Q${i + 1}: ${q.question}` : 'Your Answer Breakdown'}
                </p>
              </div>

              {!isCorrect && (
                <div className="ml-7 space-y-1 text-xs">
                  <p className="text-rose-400">
                    Your answer: {selected ?? 'None'} —{' '}
                    {q.options?.find((o: McqOptionItem) => o.label === selected)?.text ??
                      selected}
                  </p>
                  <p className="text-emerald-400">
                    Correct: {correct?.label} — {correct?.text}
                  </p>
                  {correct?.explanation && (
                    <p className="text-muted-foreground mt-1 italic">
                      {correct.explanation}
                    </p>
                  )}
                </div>
              )}

              {isCorrect && correct?.explanation && (
                <p className="ml-7 text-xs text-muted-foreground italic">
                  {correct.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
