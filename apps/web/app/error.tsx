'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-white">
      <div className="text-4xl">😕</div>
      <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
        Something went wrong
      </h2>
      <p className="text-slate-400 text-sm text-center max-w-md">
        {process.env.NODE_ENV === 'development'
          ? error.message
          : 'An unexpected error occurred'}
      </p>
      <button
        onClick={reset}
        className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2 rounded-lg transition-colors shadow-md text-sm"
      >
        Try again
      </button>
    </div>
  );
}
