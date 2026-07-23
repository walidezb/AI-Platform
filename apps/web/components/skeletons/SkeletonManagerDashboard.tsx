import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonManagerDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* 6 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-border bg-card">
            <Skeleton className="h-8 w-8 rounded-lg mb-3" />
            <Skeleton className="h-7 w-20 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-4 w-36 mb-4" />
          <Skeleton className="h-52 w-full rounded-full mx-auto max-w-[200px]" />
        </div>
      </div>
    </div>
  );
}
