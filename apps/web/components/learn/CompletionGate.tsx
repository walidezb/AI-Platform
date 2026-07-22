'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiblingModule, MilestoneExercise } from '@/hooks/learner/useModule';

interface CompletionGateProps {
  module: {
    isComplete: boolean;
    totalResources: number;
    completedResources: number;
  };
  milestone: {
    exercises?: MilestoneExercise[];
  };
  nextModule: SiblingModule | null;
  onStartExercise: (exerciseId: string) => void;
  onNextModule: (moduleId: string) => void;
}

export function CompletionGate({
  module,
  milestone,
  nextModule,
  onStartExercise,
  onNextModule,
}: CompletionGateProps) {
  const allDone = module.isComplete;

  // Find exercises for this milestone that are unlocked
  const unlockedExercises =
    milestone.exercises?.filter((e) => !e.isLocked) ?? [];

  if (!allDone) {
    // Still have resources to complete
    const remaining = module.totalResources - module.completedResources;
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2">
        <div className="text-2xl">📚</div>
        <p className="text-sm font-medium">
          Complete all resources to unlock exercises
        </p>
        <p className="text-xs text-muted-foreground">
          {remaining} resource{remaining !== 1 ? 's' : ''} remaining
        </p>
      </div>
    );
  }

  // All resources done
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      {/* Celebration banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
        <div className="text-3xl mb-2">🎉</div>
        <p className="font-semibold text-emerald-400">Module Complete!</p>
        <p className="text-sm text-muted-foreground mt-1">
          You&apos;ve finished all resources in this module.
        </p>
      </div>

      {/* Exercises CTA */}
      {unlockedExercises.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <PenTool className="h-4 w-4 text-amber-400" />
            Exercises unlocked — test your knowledge!
          </p>
          {unlockedExercises.map((ex) => (
            <Button
              key={ex.id}
              variant="outline"
              className="w-full justify-start border-amber-500/20 hover:bg-amber-500/5"
              onClick={() => onStartExercise(ex.id)}
            >
              <PenTool className="h-4 w-4 mr-3 text-amber-400" />
              <div className="text-left">
                <p className="font-medium text-sm">{ex.title}</p>
                <p className="text-xs text-muted-foreground">
                  ~{ex.estimatedMinutes || 15} min · {ex.exerciseType}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>
          ))}
        </div>
      )}

      {/* Next module CTA */}
      {nextModule && !nextModule.isLocked && (
        <Button
          className="w-full bg-gradient-primary shadow-glow-sm"
          size="lg"
          onClick={() => onNextModule(nextModule.id)}
        >
          <ChevronRight className="h-4 w-4 mr-2" />
          Next: {nextModule.title}
        </Button>
      )}

      {/* No next module — milestone might be complete */}
      {!nextModule && (
        <Button
          className="w-full"
          variant="outline"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Path Overview
        </Button>
      )}
    </motion.div>
  );
}
