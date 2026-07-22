'use client';

import { useState, useEffect, useCallback } from 'react';

const DRAFT_KEY = (exerciseId: string) => `exercise-draft:${exerciseId}`;

export function useDraft(exerciseId: string) {
  const [draft, setDraft] = useState<string | null>(null);
  const [showRestorePrompt, setShow] = useState(false);

  // On mount: check for existing draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY(exerciseId));
      if (saved) {
        const { text, savedAt } = JSON.parse(saved);
        // Only restore if draft is < 24 hours old
        const hoursSince =
          (Date.now() - new Date(savedAt).getTime()) / 3_600_000;
        if (hoursSince < 24 && text?.length > 20) {
          setDraft(text);
          setShow(true);
        } else {
          // Expired draft — clear it
          localStorage.removeItem(DRAFT_KEY(exerciseId));
        }
      }
    } catch {
      /* localStorage unavailable */
    }
  }, [exerciseId]);

  const saveDraft = useCallback(
    (text: string) => {
      try {
        localStorage.setItem(
          DRAFT_KEY(exerciseId),
          JSON.stringify({
            text,
            savedAt: new Date().toISOString(),
          }),
        );
      } catch {
        /* storage full or unavailable */
      }
    },
    [exerciseId],
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY(exerciseId));
    } catch {
      /* ignore */
    }
    setDraft(null);
    setShow(false);
  }, [exerciseId]);

  const restoreDraft = useCallback(() => {
    setShow(false);
    return draft;
  }, [draft]);

  return { draft, showRestorePrompt, saveDraft, clearDraft, restoreDraft };
}
