'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Map } from 'lucide-react';
import { useLearningPath } from '@/hooks/learner/useLearningPath';
import { PathHeader } from '@/components/learn/PathHeader';
import { MilestoneCard } from '@/components/learn/MilestoneCard';
import { SkeletonPathOverview } from '@/components/skeletons';
import { ApiErrorState } from '@/components/ApiErrorState';
import { useApiError } from '@/hooks/useApiError';
import { EmptyState } from '@/components/ui/EmptyState';

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
      {/* ── PATH HEADER ── */}
      <PathHeader path={path} />

      {/* ── MILESTONE ROADMAP ── */}
      <div className="relative">
        {/* Vertical connecting line */}
        <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-primary/30 via-border to-transparent" />

        <motion.div layout className="space-y-4">
          {path.milestones.map((milestone, i) => (
            <motion.div
              key={milestone.id}
              layout // smooth reorder / state animation
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <MilestoneCard
                milestone={milestone}
                index={i}
                onContinue={(moduleId) =>
                  router.push(`/learn/module/${moduleId}`)
                }
                onReview={(moduleId) =>
                  router.push(`/learn/module/${moduleId}`)
                }
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
