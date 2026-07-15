import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusType = 'active' | 'completed' | 'accepted' | 'locked' | 'in-progress' |
                         'not-started' | 'failed' | 'pending' | 'stalled' | 'revoked' | 'expired';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    active: {
      label: 'Active',
      colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      dotClass: 'bg-blue-400 animate-pulse',
    },
    completed: {
      label: 'Completed',
      colorClass: 'bg-success/10 text-success border-success/20',
      dotClass: 'bg-success',
    },
    accepted: {
      label: 'Accepted',
      colorClass: 'bg-success/10 text-success border-success/20',
      dotClass: 'bg-success',
    },
    locked: {
      label: 'Locked',
      colorClass: 'bg-muted text-muted-foreground border-border',
      icon: Lock,
    },
    'in-progress': {
      label: 'In Progress',
      colorClass: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      dotClass: 'bg-indigo-500 animate-pulse',
    },
    'not-started': {
      label: 'Not Started',
      colorClass: 'bg-muted text-muted-foreground border-border',
      dotClass: 'bg-muted-foreground/65',
    },
    failed: {
      label: 'Failed',
      colorClass: 'bg-destructive/10 text-destructive border-destructive/20',
      dotClass: 'bg-destructive',
    },
    pending: {
      label: 'Pending',
      colorClass: 'bg-warning/10 text-warning border-warning/20',
      dotClass: 'bg-warning',
    },
    stalled: {
      label: 'Stalled',
      colorClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      dotClass: 'bg-orange-500',
    },
    revoked: {
      label: 'Revoked',
      colorClass: 'bg-slate-900 text-slate-500 border-slate-800',
      dotClass: 'bg-slate-500',
    },
    expired: {
      label: 'Expired',
      colorClass: 'bg-destructive/10 text-destructive border-destructive/20',
      dotClass: 'bg-destructive',
    },
  };

  const config = statusConfig[status] || statusConfig['not-started'];
  const Icon = 'icon' in config ? config.icon : undefined;
  const dotClass = 'dotClass' in config ? config.dotClass : undefined;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-xs select-none",
      config.colorClass,
      className
    )}>
      {Icon ? (
        <Icon className="h-3 w-3 shrink-0" />
      ) : (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClass)} />
      )}
      {config.label}
    </span>
  );
}
