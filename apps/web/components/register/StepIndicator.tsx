'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { number: 1, label: 'Company' },
    { number: 2, label: 'Account' },
    { number: 3, label: 'Ready' },
  ];

  return (
    <div className="w-full py-4 select-none">
      <div className="flex items-center justify-between relative max-w-xs mx-auto">
        {/* Connecting Lines */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 -z-10" />
        
        {steps.map((step) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isFuture = currentStep < step.number;

          return (
            <div key={step.number} className="flex flex-col items-center gap-2 relative">
              {/* Circle */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 relative",
                  isCompleted && "bg-primary border-primary text-white",
                  isCurrent && "border-primary bg-slate-900 text-primary glow-border pulse-ring",
                  isFuture && "border-slate-800 bg-slate-950 text-slate-500"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] uppercase font-black tracking-wider text-center",
                  isCurrent ? "text-primary font-bold" : "text-muted-foreground"
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
