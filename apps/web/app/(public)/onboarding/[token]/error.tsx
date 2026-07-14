'use client';

import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function OnboardingError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <Card className="max-w-md w-full p-8 text-center bg-slate-900/60 border-slate-800/80 backdrop-blur-md shadow-2xl">
        <div className="text-5xl mb-4 select-none">⚠️</div>
        <h1 className="text-xl font-heading font-bold text-white tracking-tight">
          Something went wrong
        </h1>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          An unexpected error occurred while loading your invitation. Please confirm your internet connection is stable.
        </p>
        <div className="h-px bg-slate-800 my-5" />
        <div className="flex gap-2">
          <Button 
            onClick={() => reset()} 
            className="flex-1 bg-gradient-primary border-0 text-white font-bold text-xs h-9"
          >
            Retry
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="flex-1 border-slate-800 hover:bg-slate-900 text-xs h-9"
          >
            Refresh Page
          </Button>
        </div>
      </Card>
    </div>
  );
}
