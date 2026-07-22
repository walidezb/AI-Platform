import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function ModuleViewSkeleton() {
  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar skeleton */}
      <div className="w-72 border-r border-border p-4 space-y-3 hidden lg:block">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-48" />
        <div className="space-y-2 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Main skeleton */}
      <div className="flex-1 p-8 space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-4 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
