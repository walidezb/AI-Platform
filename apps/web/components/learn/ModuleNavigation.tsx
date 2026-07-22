import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SiblingModule } from '@/hooks/learner/useModule';

interface ModuleNavigationProps {
  prev: SiblingModule | null;
  next: SiblingModule | null;
  isComplete: boolean;
  onNavigate: (id: string) => void;
}

export function ModuleNavigation({
  prev,
  next,
  isComplete,
  onNavigate,
}: ModuleNavigationProps) {
  if (!prev && !next) return null;

  return (
    <div className="flex items-center justify-between pt-4 border-t border-border mt-8">
      <div>
        {prev ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(prev.id)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-2" />
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Previous</p>
              <p className="text-sm font-medium truncate max-w-[140px]">
                {prev.title}
              </p>
            </div>
          </Button>
        ) : (
          <div />
        )}
      </div>

      <div>
        {next && !next.isLocked ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(next.id)}
            disabled={!isComplete}
            className={cn(
              'text-muted-foreground',
              isComplete && 'hover:text-foreground',
            )}
          >
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Next</p>
              <p className="text-sm font-medium truncate max-w-[140px]">
                {next.title}
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 ml-2" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
