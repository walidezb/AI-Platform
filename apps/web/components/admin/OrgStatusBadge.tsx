'use client';

import React from 'react';
import { cn } from '@/lib/utils';

const STATUS_MAP = {
  ACTIVE: {
    label: 'Active',
    class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  TRIAL: {
    label: 'Trial',
    class: 'bg-primary/10 text-primary border-primary/20',
  },
  SUSPENDED: {
    label: 'Suspended',
    class: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  CANCELED: {
    label: 'Canceled',
    class: 'bg-secondary text-muted-foreground border-border',
  },
};

export function OrgStatusBadge({ status }: { status: string }) {
  const cfg =
    STATUS_MAP[status as keyof typeof STATUS_MAP] ?? STATUS_MAP.ACTIVE;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md',
        'text-xs font-medium border',
        cfg.class,
      )}
    >
      {cfg.label}
    </span>
  );
}
