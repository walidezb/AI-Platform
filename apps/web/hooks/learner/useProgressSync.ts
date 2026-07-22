'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Global hook — mounts once in the learner layout.
 * Syncs progress on tab focus and every 5 minutes.
 * Ensures the learner always sees fresh data.
 */
export function useProgressSync() {
  const queryClient = useQueryClient();

  // Refetch on tab focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['learner-dashboard'] });
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [queryClient]);

  // Periodic sync every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['learner-dashboard'] });
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [queryClient]);
}
