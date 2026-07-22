import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getModuleTypeIcon } from '@/lib/utils/module-icons';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface ModuleHeaderProps {
  module: {
    id: string;
    title: string;
    description: string;
    moduleType: string;
    estimatedMinutes: number;
    completedResources: number;
    totalResources: number;
    completionPct: number;
  };
}

export function ModuleHeader({ module }: ModuleHeaderProps) {
  const TYPE_CONFIG: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    READING: {
      label: 'Reading',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    VIDEO: { label: 'Video', color: 'text-red-400', bg: 'bg-red-500/10' },
    EXERCISE: {
      label: 'Exercise',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    QUIZ: { label: 'Quiz', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  };
  const config = TYPE_CONFIG[module.moduleType] || TYPE_CONFIG.READING;

  return (
    <div className="space-y-3">
      {/* Type badge + duration */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-medium',
            'px-2.5 py-1 rounded-full border',
            config.color,
            config.bg,
            'border-current/20',
          )}
        >
          {getModuleTypeIcon(module.moduleType)}
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          ~{module.estimatedMinutes} min
        </span>
      </div>

      {/* Title + description */}
      <div>
        <h1 className="font-heading text-xl font-bold leading-snug">
          {module.title}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {module.description}
        </p>
      </div>

      {/* Resource progress */}
      <div className="flex items-center gap-3">
        <ProgressBar
          value={module.completionPct}
          className="flex-1 h-1.5"
          animated
        />
        <span className="text-xs text-muted-foreground shrink-0">
          {module.completedResources}/{module.totalResources} done
        </span>
      </div>
    </div>
  );
}
