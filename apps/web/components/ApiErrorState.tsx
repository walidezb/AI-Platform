import React from 'react';
import Link from 'next/link';
import {
  SearchX,
  ShieldOff,
  AlertTriangle,
  ServerCrash,
  Timer,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ErrorStateProps = {
  status?: number;
  message?: string;
  onRetry?: () => void;
  className?: string;
};

const ERROR_CONFIGS = {
  404: {
    icon: <SearchX className="h-8 w-8" />,
    title: 'Not Found',
    desc: "The resource you're looking for doesn't exist.",
    color: 'text-muted-foreground',
  },
  403: {
    icon: <ShieldOff className="h-8 w-8" />,
    title: 'Access Denied',
    desc: "You don't have permission to view this.",
    color: 'text-amber-400',
  },
  402: {
    icon: <AlertTriangle className="h-8 w-8" />,
    title: 'AI Features Unavailable',
    desc: "Your organization's AI budget has been reached.",
    color: 'text-amber-400',
  },
  500: {
    icon: <ServerCrash className="h-8 w-8" />,
    title: 'Server Error',
    desc: 'Something went wrong on our end. Please try again.',
    color: 'text-rose-400',
  },
  408: {
    icon: <Timer className="h-8 w-8" />,
    title: 'Request Timeout',
    desc: 'The request took too long. Check your connection.',
    color: 'text-amber-400',
  },
  network: {
    icon: <WifiOff className="h-8 w-8" />,
    title: 'Connection Error',
    desc: 'Unable to connect. Check your internet connection.',
    color: 'text-rose-400',
  },
};

export function ApiErrorState({
  status,
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  const key = status?.toString() as keyof typeof ERROR_CONFIGS;
  const config = ERROR_CONFIGS[key] ?? ERROR_CONFIGS[500];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[200px] p-8 text-center gap-3',
        className,
      )}
    >
      <div
        className={cn(
          'h-14 w-14 rounded-2xl flex items-center justify-center bg-secondary/50',
          config.color,
        )}
      >
        {config.icon}
      </div>

      <div>
        <h3 className="text-base font-semibold mb-1">{config.title}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {message ?? config.desc}
        </p>
      </div>

      {onRetry && status !== 403 && status !== 402 && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 inline me-1.5" />
          Try Again
        </button>
      )}

      {status === 403 && (
        <Link
          href="/"
          className="mt-1 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary/50"
        >
          ← Go Back
        </Link>
      )}

      {status === 402 && (
        <Link
          href="/manage/billing"
          className="mt-1 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-sm font-medium hover:bg-amber-500/20"
        >
          View Billing →
        </Link>
      )}
    </div>
  );
}
