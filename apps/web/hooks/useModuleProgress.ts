import { useState, useEffect, useRef, useCallback } from 'react';
import { apiPost } from '@/lib/api-client';
import { toast } from 'sonner';

export function useModuleProgress(moduleId: string) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const startTimeRef = useRef<number>(Date.now());
  const accumulatedRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    isVisibleRef.current = !document.hidden;

    const handleVisibility = () => {
      if (document.hidden) {
        if (isVisibleRef.current) {
          accumulatedRef.current += Date.now() - startTimeRef.current;
          isVisibleRef.current = false;
        }
      } else {
        startTimeRef.current = Date.now();
        isVisibleRef.current = true;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const getForegroundSeconds = useCallback((): number => {
    const inProgress = isVisibleRef.current
      ? Date.now() - startTimeRef.current
      : 0;
    return Math.floor((accumulatedRef.current + inProgress) / 1000);
  }, []);

  const markResourceComplete = useCallback(
    async (resourceId: string) => {
      setCompletedIds((prev) => new Set([...prev, resourceId]));

      try {
        await apiPost('/progress/resource/complete', {
          resourceId,
          timeSpentSeconds: getForegroundSeconds(),
        });
      } catch {
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(resourceId);
          return next;
        });
        toast.error('Failed to save progress. Please try again.');
      }
    },
    [getForegroundSeconds],
  );

  useEffect(() => {
    return () => {
      const seconds = getForegroundSeconds();
      if (seconds > 5 && moduleId) {
        const body = JSON.stringify({ seconds });
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const url = `${apiUrl}/progress/module/${moduleId}/time-spent`;
        const sent =
          typeof navigator !== 'undefined' &&
          navigator.sendBeacon &&
          navigator.sendBeacon(
            url,
            new Blob([body], { type: 'application/json' }),
          );

        if (!sent && typeof fetch !== 'undefined') {
          fetch(url, {
            method: 'POST',
            body,
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
          }).catch(() => {});
        }
      }
    };
  }, [moduleId, getForegroundSeconds]);

  return {
    completedIds,
    markResourceComplete,
    getForegroundSeconds,
  };
}
