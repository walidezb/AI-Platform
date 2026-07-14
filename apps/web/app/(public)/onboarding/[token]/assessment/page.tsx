'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { OnboardingSteps } from '@/components/onboarding/OnboardingSteps';

export default function AssessmentPlaceholderPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl" />

      <Card className="max-w-md w-full bg-slate-900/40 border-slate-800 backdrop-blur-md shadow-2xl p-8 flex flex-col items-center gap-6 relative z-10">
        
        {/* Pulsing bot status */}
        <div className="text-6xl animate-pulse select-none">🤖</div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold font-heading text-white tracking-tight">AI Skills Assessment</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            In Step 2.5, we will build the interactive cognitive test and questionnaire module.
          </p>
        </div>

        <div className="w-full h-px bg-slate-800 my-2" />

        <div className="w-full">
          <OnboardingSteps currentStep={1} />
        </div>
      </Card>
    </div>
  );
}
