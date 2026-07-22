'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Map } from 'lucide-react';
import { useLearningPath } from '@/hooks/learner/useLearningPath';
import { PathHeader } from '@/components/learn/PathHeader';
import { MilestoneCard } from '@/components/learn/MilestoneCard';
import { PathOverviewSkeleton } from '@/components/learn/PathOverviewSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PathOverviewPage({
  params,
}: {
  params: Promise<{ pathId: string }> | { pathId: string };
}) {
  const resolvedParams = React.use(Promise.resolve(params));
  const { pathId } = resolvedParams;

  const { data: path, isLoading } = useLearningPath(pathId);
  const router = useRouter();

  if (isLoading) return <PathOverviewSkeleton />;
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

        <div className="space-y-4">
          {path.milestones.map((milestone, i) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              index={i}
              onContinue={(moduleId) =>
                router.push(`/learn/module/${moduleId}`)
              }
              onReview={(moduleId) =>
                router.push(`/learn/module/${moduleId}`)
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
