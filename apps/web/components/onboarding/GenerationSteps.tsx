'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  label: string;
  detail: string;
  icon: string;
  startsAt: number; // seconds elapsed
}

const STEPS: Step[] = [
  { label: 'Analyzing your responses',    detail: 'Understanding your skill level and goals', icon: '🔍', startsAt: 0 },
  { label: 'Identifying skill gaps',      detail: 'Mapping what you know vs what you need',  icon: '📊', startsAt: 4 },
  { label: 'Curating learning resources', detail: 'Finding the best content across the web',  icon: '🌐', startsAt: 10 },
  { label: 'Structuring milestones',      detail: 'Organizing content into a logical path',   icon: '🗺️', startsAt: 18 },
  { label: 'Generating exercises',        detail: 'Creating assessments to test your knowledge', icon: '✏️', startsAt: 25 },
];

interface GenerationStepsProps {
  elapsedSeconds: number;
}

export function GenerationSteps({ elapsedSeconds }: GenerationStepsProps) {
  return (
    <div className="text-left space-y-4 max-w-sm mx-auto bg-slate-900/30 border border-slate-800/40 p-5 rounded-2xl backdrop-blur-sm">
      {STEPS.map((step, i) => {
        const isComplete = elapsedSeconds > step.startsAt + 5;
        const isActive = elapsedSeconds >= step.startsAt && !isComplete;
        const isFuture = elapsedSeconds < step.startsAt;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: isFuture ? 0.35 : 1,
              x: 0,
            }}
            transition={{ duration: 0.4 }}
            className="flex items-start gap-4"
          >
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-sm shrink-0 border transition-all duration-300",
              isComplete && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              isActive && "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-pulse",
              isFuture && "bg-slate-900 border-slate-800 text-slate-500",
            )}>
              {isComplete ? <Check className="h-4 w-4" /> : step.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium transition-colors duration-300",
                isComplete && "text-slate-500 line-through decoration-slate-700",
                isActive && "text-indigo-400 font-semibold",
                isFuture && "text-slate-400",
              )}>
                {step.label}
                {isActive && (
                  <span className="ml-2 inline-flex gap-0.5 align-middle">
                    {[0, 1, 2].map((j) => (
                      <span key={j} className="h-1 w-1 rounded-full bg-indigo-400 animate-bounce"
                            style={{ animationDelay: `${j * 0.15}s` }} />
                    ))}
                  </span>
                )}
              </p>
              {isActive && (
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.detail}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
