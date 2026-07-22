import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function PathOverviewSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="pl-14">
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
