import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonModulePage() {
  return (
    <div className="flex h-full animate-pulse">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex w-64 border-e border-border flex-col p-4 gap-2">
        <Skeleton className="h-4 w-32 mb-3" />
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 flex-1" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-4 md:p-6 space-y-5">
        <Skeleton className="h-6 w-64 mb-1" />
        <Skeleton className="h-4 w-40 mb-5" />

        {/* Video skeleton (16:9) */}
        <Skeleton className="w-full aspect-video rounded-xl" />

        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />

        <div className="flex gap-3 mt-4">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
