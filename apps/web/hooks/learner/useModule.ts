'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { createApiClient } from '@/lib/api-client';

export interface ModuleResource {
  id: string;
  moduleId: string;
  title: string;
  url: string;
  resourceType: string; // READING, VIDEO, DOCUMENTATION, PODCAST
  durationMinutes?: number | null;
  sourcePlatform: string;
  qualityScore: number;
  description?: string | null;
  sequenceOrder: number;
  isCompleted: boolean;
}

export interface SiblingModule {
  id: string;
  title: string;
  moduleType: string;
  estimatedMinutes: number;
  isLocked: boolean;
  sequenceOrder: number;
}

export interface MilestoneExercise {
  id: string;
  title: string;
  exerciseType: string;
  estimatedMinutes?: number;
  isLocked?: boolean;
}

export interface ModuleDetailData {
  module: {
    id: string;
    milestoneId: string;
    sequenceOrder: number;
    title: string;
    description: string;
    moduleType: string;
    estimatedMinutes: number;
    resources: ModuleResource[];
    completedResources: number;
    totalResources: number;
    completionPct: number;
    isComplete: boolean;
  };
  milestone: {
    id: string;
    title: string;
    sequenceOrder: number;
    modules: SiblingModule[];
    exercises: MilestoneExercise[];
  };
  path: {
    id: string;
    title: string;
    organizationId: string;
  };
  navigation: {
    nextModule: SiblingModule | null;
    prevModule: SiblingModule | null;
  };
}

export function useModule(moduleId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['module', moduleId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: ModuleDetailData }>(`/paths/modules/${moduleId}`);
      return res;
    },
    staleTime: 15_000,
    enabled: !!moduleId,
    select: (res) => res.data,
  });
}

export function useMarkResourceComplete() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resourceId,
      timeSpentSeconds,
    }: {
      resourceId: string;
      timeSpentSeconds?: number;
    }) => {
      const client = createApiClient(getToken);
      return client.post('/progress/resource/complete', {
        resourceId,
        timeSpentSeconds,
      });
    },

    // Optimistic update — immediately mark as complete in UI
    onMutate: async ({ resourceId }) => {
      await queryClient.cancelQueries({ queryKey: ['module'] });
      const previous = queryClient.getQueriesData({ queryKey: ['module'] });

      queryClient.setQueriesData(
        { queryKey: ['module'] },
        (old: any) => {
          if (!old?.module?.resources) return old;
          const updatedResources = old.module.resources.map((r: any) =>
            r.id === resourceId ? { ...r, isCompleted: true } : r,
          );
          const newCompletedCount = updatedResources.filter((r: any) => r.isCompleted).length;
          const totalResources = old.module.totalResources || updatedResources.length;

          return {
            ...old,
            module: {
              ...old.module,
              resources: updatedResources,
              completedResources: newCompletedCount,
              completionPct: totalResources > 0 ? Math.round((newCompletedCount / totalResources) * 100) : 0,
              isComplete: totalResources > 0 && newCompletedCount === totalResources,
            },
          };
        },
      );
      return { previous };
    },

    onError: (err, vars, ctx) => {
      // Revert optimistic update on error
      ctx?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },

    onSuccess: (response: any) => {
      const data = response?.data || response;

      // Show unlock toasts
      if (data?.unlockedModuleId) {
        toast.success('🔓 New module unlocked!', {
          description: 'Great work! The next module is now available.',
          duration: 4000,
        });
      }

      if (data?.unlockedExercises && data.unlockedExercises.length > 0) {
        toast.success('✏️ Exercise unlocked!', {
          description: 'Test your knowledge with the milestone exercise.',
          duration: 4000,
        });
      }

      if (data?.isModuleComplete) {
        toast.success('✅ Module complete!', {
          description: 'All resources finished. Keep going!',
          duration: 3000,
        });
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['module'] });
      queryClient.invalidateQueries({ queryKey: ['learner-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['learning-path'] });
    },
  });
}
