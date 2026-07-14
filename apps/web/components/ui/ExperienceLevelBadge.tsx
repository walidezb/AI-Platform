import { cn } from '@/lib/utils';

const CONFIG = {
  BEGINNER: {
    label: 'Beginner',
    icon: '🌱',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  INTERMEDIATE: {
    label: 'Intermediate',
    icon: '⚡',
    className: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  },
  ADVANCED: {
    label: 'Advanced',
    icon: '🔥',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
};

interface ExperienceLevelBadgeProps {
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | string;
}

export function ExperienceLevelBadge({ level }: ExperienceLevelBadgeProps) {
  const config = CONFIG[level as keyof typeof CONFIG] || CONFIG.INTERMEDIATE;
  return (
    <span className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
      'text-sm font-medium border',
      config.className
    )}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
