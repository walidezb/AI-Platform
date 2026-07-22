import React from 'react';
import { Clock, Check, AlertTriangle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_MAP = {
  PENDING: {
    label: 'Pending',
    icon: <Clock className="h-3 w-3" />,
    class: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    icon: <div className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />,
    class: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  },
  ACCEPTED: {
    label: 'Accepted',
    icon: <Check className="h-3 w-3" />,
    class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  EXPIRED: {
    label: 'Expired',
    icon: <AlertTriangle className="h-3 w-3" />,
    class: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  REVOKED: {
    label: 'Revoked',
    icon: <Ban className="h-3 w-3" />,
    class: 'bg-secondary text-muted-foreground border-border',
  },
};

export function InviteStatusBadge({ status }: { status: string }) {
  const cfg =
    STATUS_MAP[status as keyof typeof STATUS_MAP] ?? STATUS_MAP.PENDING;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5',
        'rounded-md text-xs font-medium border',
        cfg.class,
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
