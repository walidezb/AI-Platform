import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonEmployeeTable() {
  return (
    <div className="animate-pulse">
      {/* Desktop skeleton */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary/20">
          <div className="flex gap-6">
            {['w-40', 'w-24', 'w-24', 'w-32', 'w-16', 'w-16'].map((w, i) => (
              <Skeleton key={i} className={`h-3 ${w}`} />
            ))}
          </div>
        </div>
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3.5 border-b border-border last:border-0">
            <div className="flex items-center gap-3 w-40">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div>
                <Skeleton className="h-3.5 w-24 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-24" />
            <div className="w-32">
              <div className="flex justify-between mb-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Mobile skeleton (card list) */}
      <div className="md:hidden space-y-3">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-1" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full mb-3" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
