'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, BookOpen } from 'lucide-react';
import { useModule } from '@/hooks/learner/useModule';
import { ModuleSidebar } from '@/components/learn/ModuleSidebar';
import { ModuleHeader } from '@/components/learn/ModuleHeader';
import { ResourceCard } from '@/components/learn/ResourceCard';
import { CompletionGate } from '@/components/learn/CompletionGate';
import { ModuleNavigation } from '@/components/learn/ModuleNavigation';
import { ModuleViewSkeleton } from '@/components/learn/ModuleViewSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ModuleViewPage({
  params,
}: {
  params: Promise<{ moduleId: string }> | { moduleId: string };
}) {
  const resolvedParams = React.use(Promise.resolve(params));
  const { moduleId } = resolvedParams;

  const { data, isLoading } = useModule(moduleId);
  const router = useRouter();

  // Track time spent on this module
  const startTimeRef = useRef<number>(Date.now());
  const [, setTimeSpent] = React.useState(0);

  // Update time every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <ModuleViewSkeleton />;
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={BookOpen}
          title="Module Not Found"
          description="The requested module could not be found or you do not have permission to access it."
        />
      </div>
    );
  }

  const { module, milestone, path, navigation } = data;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ── LEFT SIDEBAR: Module Navigation ── */}
      <ModuleSidebar
        milestone={milestone}
        currentModuleId={moduleId}
        pathId={path.id}
        onNavigate={(id) => router.push(`/learn/module/${id}`)}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/learn/dashboard"
              className="hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              href={`/learn/path/${path.id}`}
              className="hover:text-foreground transition-colors truncate max-w-[120px]"
            >
              {path.title}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground truncate max-w-[150px]">
              {module.title}
            </span>
          </nav>

          {/* Module header */}
          <ModuleHeader module={module} />

          {/* Resource list */}
          <div className="space-y-4">
            {module.resources.map((resource, i) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                index={i}
                startTime={startTimeRef}
              />
            ))}
          </div>

          {/* Completion gate */}
          <CompletionGate
            module={module}
            milestone={milestone}
            onStartExercise={(exerciseId) =>
              router.push(`/learn/exercise/${exerciseId}`)
            }
            onNextModule={(id) => router.push(`/learn/module/${id}`)}
            nextModule={navigation.nextModule}
          />

          {/* Prev / Next navigation */}
          <ModuleNavigation
            prev={navigation.prevModule}
            next={navigation.nextModule}
            isComplete={module.isComplete}
            onNavigate={(id) => router.push(`/learn/module/${id}`)}
          />
        </div>
      </div>
    </div>
  );
}
