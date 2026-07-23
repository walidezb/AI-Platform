import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonPathOverview() {
  return (
    <div className="p-4 md:p-6 space-y-5 animate-pulse">
      {/* Path header */}
      <div className="p-5 rounded-2xl border border-border bg-card">
        <Skeleton className="h-6 w-64 mb-2" />
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-2 w-full rounded-full mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-6 w-12 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* 3 milestone cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            {Array(3).fill(0).map((_, j) => (
              <div key={j} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
