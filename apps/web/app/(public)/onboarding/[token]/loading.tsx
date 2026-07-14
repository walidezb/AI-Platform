import React from 'react';
import { Loader2 } from 'lucide-react';

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm font-semibold text-white">Validating your invitation...</p>
        <p className="text-xs text-slate-500">Preparing your personalized roadmap</p>
      </div>
    </div>
  );
}
