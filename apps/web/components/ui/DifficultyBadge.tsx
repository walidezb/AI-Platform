import React from 'react';
import { cn } from '@/lib/utils';

const CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  FOUNDATIONAL: {
    label: 'Foundational',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  APPLIED: {
    label: 'Applied',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  ANALYTICAL: {
    label: 'Analytical',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  CREATIVE: {
    label: 'Creative',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
};

export function DifficultyBadge({ level }: { level: string }) {
  const config = CONFIG[level] || CONFIG.APPLIED;
  return (
    <span
      className={cn(
        'text-xs px-2.5 py-1 rounded-full border border-current/20 font-medium',
        config.color,
        config.bg,
      )}
    >
      {config.label}
    </span>
  );
}
