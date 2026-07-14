'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStepsProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { id: 1, number: 1, label: 'Assessment' },
  { id: 2, number: 2, label: 'Your Path' },
  { id: 3, number: 3, label: 'Start Learning' },
];

export function OnboardingSteps({ currentStep }: OnboardingStepsProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 select-none">
      {STEPS.map((step, index) => {
        const isComplete = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        const isFuture = step.id > currentStep;

        return (
          <React.Fragment key={step.id}>
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center",
                  "text-sm font-semibold transition-all duration-500",
                  isCurrent && "bg-gradient-primary text-white shadow-glow-sm ring-2 ring-primary/30",
                  isComplete && "bg-primary/20 text-primary border border-primary/30",
                  isFuture && "bg-slate-900 text-muted-foreground border border-slate-800"
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : isCurrent ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                  </span>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] md:text-xs font-medium transition-colors duration-300",
                  isCurrent ? "text-primary font-bold" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-8 sm:w-16 mx-2 mb-5 transition-all duration-700",
                  isComplete ? "bg-primary/50" : "bg-slate-800"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
