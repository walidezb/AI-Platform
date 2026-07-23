'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
    this.props.onError?.(error, info);

    // Report to Sentry if available
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      (window as any).Sentry.captureException(error, {
        extra: { componentStack: info.componentStack },
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
            <AlertOctagon className="h-7 w-7 text-rose-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-1">Something went wrong</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              An unexpected error occurred in this section.
            </p>
            {/* Show error in dev only */}
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-3 text-left text-xs text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded-lg p-3 max-w-md overflow-auto">
                {this.state.error?.message}
              </pre>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 cursor-pointer"
            >
              Try Again
            </button>
            <a
              href="mailto:support@yourplatform.com?subject=Bug Report"
              className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary/50"
            >
              Report Issue
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
