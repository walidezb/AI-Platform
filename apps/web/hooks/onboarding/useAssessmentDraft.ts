'use client';

import { useCallback } from 'react';

const DRAFT_KEY = (assessmentId: string) => `assessment-draft:${assessmentId}`;

export type DraftMessage = {
  role: 'user' | 'assistant';
  content: string;
  id: string;
};

export type Draft = {
  messages: DraftMessage[];
  assessmentId: string;
  savedAt: string;
  isComplete: boolean;
};

export function useAssessmentDraft(assessmentId: string | null) {
  const saveDraft = useCallback(
    (messages: DraftMessage[], isComplete: boolean = false) => {
      if (!assessmentId) return;
      try {
        const draft: Draft = {
          messages,
          assessmentId,
          savedAt: new Date().toISOString(),
          isComplete,
        };
        localStorage.setItem(DRAFT_KEY(assessmentId), JSON.stringify(draft));
      } catch {
        /* storage full */
      }
    },
    [assessmentId],
  );

  const loadDraft = useCallback((): Draft | null => {
    if (!assessmentId) return null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY(assessmentId));
      if (!raw) return null;
      const draft: Draft = JSON.parse(raw);

      // Expire drafts older than 2 hours (matches Redis session TTL)
      const hoursSince =
        (Date.now() - new Date(draft.savedAt).getTime()) / 3_600_000;
      if (hoursSince > 2) {
        localStorage.removeItem(DRAFT_KEY(assessmentId));
        return null;
      }
      return draft;
    } catch {
      return null;
    }
  }, [assessmentId]);

  const clearDraft = useCallback(() => {
    if (!assessmentId) return;
    try {
      localStorage.removeItem(DRAFT_KEY(assessmentId));
    } catch {
      /* ignore */
    }
  }, [assessmentId]);

  return { saveDraft, loadDraft, clearDraft };
}
