'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Props = {
  label: string;
  value: number | string;
  icon: ReactNode;
  trend?: number; // % change vs last week (positive = up)
  suffix?: string; // e.g. "%" or "h"
  color?: 'default' | 'emerald' | 'amber' | 'rose' | 'violet';
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  suffix,
  color = 'default',
}: Props) {
  const [displayVal, setDisplayVal] = useState(0);
  const numericVal = typeof value === 'number' ? value : null;

  // Count-up animation
  useEffect(() => {
    if (numericVal === null) return;
    const duration = 800;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayVal(Math.round(eased * numericVal));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [numericVal]);

  const COLOR_MAP = {
    default: 'text-indigo-400 bg-indigo-500/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
    rose: 'text-rose-400 bg-rose-400/10',
    violet: 'text-violet-400 bg-violet-400/10',
  };

  const trendColor =
    trend === undefined
      ? ''
      : trend > 0
      ? 'text-emerald-400'
      : trend < 0
      ? 'text-rose-400'
      : 'text-slate-400';

  return (
    <Card className="p-5 border-slate-800 bg-slate-900/60 hover:border-indigo-500/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
            COLOR_MAP[color],
          )}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trendColor,
            )}
          >
            {trend > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : trend < 0 ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend)}% vs last week
          </div>
        )}
      </div>
      <p className="text-2xl font-bold tabular-nums text-slate-100">
        {numericVal !== null ? displayVal : value}
        {suffix && (
          <span className="text-sm font-normal text-slate-400 ml-0.5">
            {suffix}
          </span>
        )}
      </p>
      <p className="text-sm text-slate-400 mt-0.5">{label}</p>
    </Card>
  );
}
