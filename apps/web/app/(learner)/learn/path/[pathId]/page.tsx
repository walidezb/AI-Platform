'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Map } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLearningPath } from '@/hooks/learner/useLearningPath';
import { PathHeader } from '@/components/learn/PathHeader';
import { MilestoneCard } from '@/components/learn/MilestoneCard';
import { UnlockAnimation } from '@/components/learn/UnlockAnimation';
import { SkeletonPathOverview } from '@/components/skeletons';
import { ApiErrorState } from '@/components/ApiErrorState';
import { useApiError } from '@/hooks/useApiError';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiGet } from '@/lib/api-client';

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export default function PathOverviewPage({
  params,
}: {
  params: Promise<{ pathId: string }> | { pathId: string };
}) {
  const resolvedParams = React.use(Promise.resolve(params));
  const { pathId } = resolvedParams;

  const { data: path, isLoading, isError, error, refetch } = useLearningPath(pathId);
  const { status, message } = useApiError(error);
  const router = useRouter();

  const [justUnlockedIds, setJustUnlockedIds] = useState<Set<string>>(new Set());

  const { data: unlockState } = useQuery({
    queryKey: ['unlock-state', pathId],
    queryFn: () =>
      apiGet<{ milestones: Array<{ id: string; isLocked: boolean }> }>(
        `/paths/${pathId}/unlock-state`,
      ),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const prevUnlockState = usePrevious(unlockState);

  useEffect(() => {
    if (!prevUnlockState?.milestones || !unlockState?.milestones) return;

    const newlyUnlocked: string[] = [];
    unlockState.milestones.forEach((milestone, i) => {
      const prev = prevUnlockState.milestones[i];
      if (prev && prev.isLocked && !milestone.isLocked) {
        newlyUnlocked.push(milestone.id);
      }
    });

    if (newlyUnlocked.length > 0) {
      setJustUnlockedIds((prev) => {
        const next = new Set(prev);
        newlyUnlocked.forEach((id) => next.add(id));
        return next;
      });

      setTimeout(() => {
        setJustUnlockedIds((prev) => {
          const next = new Set(prev);
          newlyUnlocked.forEach((id) => next.delete(id));
          return next;
        });
      }, 3000);
    }
  }, [unlockState, prevUnlockState]);

  if (isLoading) return <SkeletonPathOverview />;
  if (isError) return <ApiErrorState status={status} message={message} onRetry={refetch} />;
  if (!path) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={Map}
          title="Learning Path Not Found"
          description="The requested learning path could not be found or you do not have permission to view it."
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <PathHeader path={path} />

      <div className="relative">
        <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-primary/30 via-border to-transparent" />

        <motion.div layout className="space-y-4">
          {path.milestones.map((milestone, i) => (
            <motion.div
              key={milestone.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <UnlockAnimation isJustUnlocked={justUnlockedIds.has(milestone.id)}>
                <MilestoneCard
                  milestone={milestone}
                  index={i}
                  onContinue={(moduleId) => router.push(`/learn/module/${moduleId}`)}
                  onReview={(moduleId) => router.push(`/learn/module/${moduleId}`)}
                />
              </UnlockAnimation>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
