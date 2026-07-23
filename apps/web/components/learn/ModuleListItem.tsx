import React from 'react';
import { Check, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getModuleTypeIcon } from '@/lib/utils/module-icons';
import { EnrichedModule } from '@/hooks/learner/useLearningPath';

interface ModuleListItemProps {
  module: EnrichedModule;
  onClick: () => void;
}

export function ModuleListItem({ module, onClick }: ModuleListItemProps) {
  const isComplete = module.isComplete;
  const isLocked = module.isLocked;
  const isCurrent = !isComplete && !isLocked;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 min-h-[48px] px-3.5 py-3 rounded-xl border border-border/80',
        'transition-all duration-150 active:scale-[0.995]',
        isComplete && 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
        isCurrent && 'bg-primary/5 border-primary/40 cursor-pointer hover:bg-primary/10 shadow-glow-sm',
        isLocked && 'opacity-50 cursor-not-allowed text-muted-foreground border-border/50',
        !isLocked &&
          !isComplete &&
          !isCurrent &&
          'cursor-pointer hover:bg-secondary/50 hover:border-primary/30',
      )}
    >
      {/* Status icon */}
      <div className="shrink-0">
        {isComplete && (
          <div className="h-5 w-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Check className="h-3 w-3 text-emerald-400" />
          </div>
        )}
        {isCurrent && (
          <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          </div>
        )}
        {isLocked && (
          <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center">
            <Lock className="h-2.5 w-2.5 text-muted-foreground" />
          </div>
        )}
        {!isComplete && !isCurrent && !isLocked && (
          <div className="h-5 w-5 rounded-full border border-border flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          </div>
        )}
      </div>

      {/* Module type icon */}
      <div className="shrink-0">{getModuleTypeIcon(module.moduleType)}</div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            isLocked && 'text-muted-foreground',
          )}
        >
          {module.title}
        </p>
        {module.completionPct > 0 && !isComplete && (
          <p className="text-xs text-primary mt-0.5">
            {module.completionPct}% complete
          </p>
        )}
      </div>

      {/* Duration */}
      <div className="shrink-0 text-xs text-muted-foreground">
        ~{module.estimatedMinutes}m
      </div>

      {/* Navigate arrow */}
      {!isLocked && (
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      )}
    </div>
  );
}
