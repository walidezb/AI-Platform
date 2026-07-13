import React from 'react';
import { cn } from '@/lib/utils';

export function SkeletonCard() {
  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 shimmer">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
          <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-muted rounded w-full animate-pulse" />
        <div className="h-3 bg-muted rounded w-5/6 animate-pulse" />
        <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="w-full border border-border rounded-xl p-4 bg-card shimmer overflow-hidden">
      <div className="flex gap-4 border-b border-border pb-4 mb-4">
        <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
        <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
        <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
        <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <div className="h-3.5 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-3.5 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-3.5 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-3.5 bg-muted rounded w-1/4 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-6 shimmer min-h-[128px]">
          <div className="flex justify-between items-start mb-4">
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
          </div>
          <div className="h-8 bg-muted rounded w-1/3 mb-2 animate-pulse" />
          <div className="h-3.5 bg-muted rounded w-3/4 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-full bg-muted shimmer animate-pulse shrink-0", className)} />
  );
}
