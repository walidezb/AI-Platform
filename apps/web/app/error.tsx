'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ServerCrash } from 'lucide-react';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[RouteError]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="h-20 w-20 rounded-3xl bg-rose-500/10 flex items-center justify-center mx-auto">
          <ServerCrash className="h-10 w-10 text-rose-400" />
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Server Error</h1>
          <p className="text-muted-foreground">
            Something went wrong on our end. The error has been logged and we&apos;ll look into it.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className="mt-2 text-xs text-rose-400 font-mono">
              {error.message}
            </p>
          )}
          {error.digest && (
            <p className="mt-1 text-xs text-muted-foreground/60">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 cursor-pointer"
          >
            Try Again
          </button>

          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary/50"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
