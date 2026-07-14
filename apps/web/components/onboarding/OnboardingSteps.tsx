'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface OnboardingStepsProps {
  currentStep: 1 | 2 | 3;
}

export function OnboardingSteps({ currentStep }: OnboardingStepsProps) {
  const steps = [
    { num: 1, label: 'Assessment' },
    { num: 2, label: 'Your Path' },
    { num: 3, label: 'Start Learning' },
  ];

  return (
    <div className="w-full max-w-md mx-auto select-none mt-2">
      <div className="relative flex items-center justify-between">
        {/* Connection progress lines */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
        <div 
          className="absolute left-0 top-1/2 h-0.5 bg-gradient-primary -translate-y-1/2 z-0 transition-all duration-500 ease-out" 
          style={{ 
            width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' 
          }} 
        />

        {steps.map((step) => {
          const isCompleted = step.num < currentStep;
          const isActive = step.num === currentStep;

          return (
            <div key={step.num} className="relative z-10 flex flex-col items-center">
              {/* Step bubble */}
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  isCompleted 
                    ? "bg-gradient-primary text-white shadow-glow-sm" 
                    : isActive 
                    ? "bg-white text-slate-950 ring-4 ring-primary/20" 
                    : "bg-slate-900 text-slate-400 border border-slate-800"
                )}
              >
                {step.num}
              </div>
              <span 
                className={cn(
                  "text-[10px] mt-2 font-medium tracking-wide transition-all duration-300",
                  isActive ? "text-white font-bold" : "text-slate-400"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
