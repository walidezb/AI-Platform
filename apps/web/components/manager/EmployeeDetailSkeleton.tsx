'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

export function EmployeeDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
      <div className="h-8 w-32 bg-slate-800 rounded animate-pulse" />
      {/* Header card */}
      <Card className="p-6 border-slate-800 bg-slate-900/60">
        <div className="flex gap-5">
          <div className="h-16 w-16 rounded-full bg-slate-800 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-800 rounded animate-pulse" />
            <div className="flex gap-4 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-16 bg-slate-800 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </Card>
      {/* Skill profile card */}
      <Card className="p-5 border-slate-800 bg-slate-900/60">
        <div className="h-4 w-32 mb-4 bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 bg-slate-800 rounded animate-pulse" />
              <div className="flex gap-1.5 flex-wrap">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-6 w-16 rounded-md bg-slate-800 animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
      {/* Chart card */}
      <Card className="p-5 border-slate-800 bg-slate-900/60">
        <div className="h-4 w-40 mb-4 bg-slate-800 rounded animate-pulse" />
        <div className="h-40 w-full rounded-lg bg-slate-800 animate-pulse" />
      </Card>
    </div>
  );
}
