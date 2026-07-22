'use client';

import React from 'react';
import { useProgressSync } from '@/hooks/learner/useProgressSync';

export function LearnerProgressSyncWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useProgressSync();
  return <>{children}</>;
}
