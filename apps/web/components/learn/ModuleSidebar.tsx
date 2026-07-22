import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getModuleTypeIcon } from '@/lib/utils/module-icons';
import { SiblingModule, MilestoneExercise } from '@/hooks/learner/useModule';

interface ModuleSidebarProps {
  milestone: {
    id: string;
    title: string;
    sequenceOrder: number;
    modules: SiblingModule[];
    exercises: MilestoneExercise[];
  };
  currentModuleId: string;
  pathId: string;
  onNavigate: (id: string) => void;
}

export function ModuleSidebar({
  milestone,
  currentModuleId,
  pathId,
  onNavigate,
}: ModuleSidebarProps) {
  return (
    <div className="w-72 shrink-0 border-r border-border overflow-y-auto bg-card hidden lg:flex flex-col">
      {/* Sidebar header */}
      <div className="p-4 border-b border-border">
        <Link
          href={`/learn/path/${pathId}`}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Path
        </Link>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Milestone {milestone.sequenceOrder}
        </p>
        <h3 className="font-semibold text-sm leading-snug">
          {milestone.title}
        </h3>
      </div>

      {/* Module list */}
      <div className="flex-1 p-3 space-y-1">
        {milestone.modules.map((mod) => {
          const isCurrent = mod.id === currentModuleId;
          const isLocked = mod.isLocked;

          return (
            <button
              key={mod.id}
              disabled={isLocked}
              onClick={() => !isLocked && onNavigate(mod.id)}
              className={cn(
                'w-full text-left flex items-center gap-3',
                'px-3 py-2.5 rounded-lg text-sm transition-all',
                isCurrent && 'bg-primary/10 text-primary font-medium',
                !isCurrent &&
                  !isLocked &&
                  'text-muted-foreground hover:bg-secondary/60',
                isLocked &&
                  'opacity-40 cursor-not-allowed text-muted-foreground',
              )}
            >
              <div className="shrink-0">
                {getModuleTypeIcon(mod.moduleType)}
              </div>
              <span className="flex-1 truncate leading-snug">{mod.title}</span>
              {isLocked && <Lock className="h-3 w-3 shrink-0" />}
              {!isLocked && !isCurrent && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {mod.estimatedMinutes}m
                </span>
              )}
              {isCurrent && (
                <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Exercises section */}
      {milestone.exercises && milestone.exercises.length > 0 && (
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Exercises
          </p>
          {milestone.exercises.map((ex) => (
            <div
              key={ex.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg',
                'text-sm text-muted-foreground',
                ex.isLocked && 'opacity-40',
              )}
            >
              <PenTool className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="flex-1 truncate">{ex.title}</span>
              {ex.isLocked && <Lock className="h-3 w-3 shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
