'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Props = {
  activityByDate: Record<string, number>;
};

export function ActivityHeatmap({ activityByDate }: Props) {
  // Generate last 30 days
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });

  const maxActivity = Math.max(...Object.values(activityByDate), 1);

  const getIntensity = (count: number) => {
    if (!count) return 0;
    return Math.ceil((count / maxActivity) * 4); // 1–4
  };

  const INTENSITY_CLASSES = [
    'bg-secondary', // 0: none
    'bg-emerald-500/20', // 1: low
    'bg-emerald-500/40', // 2: medium
    'bg-emerald-500/70', // 3: high
    'bg-emerald-500', // 4: max
  ];

  return (
    <TooltipProvider>
      <div>
        <p className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
          <span>Learning Activity (last 30 days)</span>
          <span className="flex items-center gap-1">
            Less
            {INTENSITY_CLASSES.map((cls, i) => (
              <div key={i} className={cn('h-3 w-3 rounded-sm', cls)} />
            ))}
            More
          </span>
        </p>

        <div className="flex flex-wrap gap-1">
          {days.map((dateStr) => {
            const count = activityByDate[dateStr] ?? 0;
            const intensity = getIntensity(count);
            const dayLabel = new Date(dateStr).toLocaleDateString('en', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <Tooltip key={dateStr}>
                <TooltipTrigger
                  className={cn(
                    'h-4 w-4 rounded-sm transition-all duration-200',
                    'cursor-default hover:ring-1 hover:ring-emerald-400/50',
                    INTENSITY_CLASSES[intensity],
                  )}
                />
                <TooltipContent>
                  <p className="text-xs">
                    {dayLabel}: {count} resource{count !== 1 ? 's' : ''}{' '}
                    completed
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
