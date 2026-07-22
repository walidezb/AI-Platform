'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useBudgetStatus } from '@/hooks/useBudgetStatus';

export function BudgetExceededBanner() {
  const { data: budget } = useBudgetStatus();
  const { user } = useUser();

  // Only show to learners when budget exceeded
  if (!budget?.isExceeded) return null;
  if (user?.publicMetadata?.role !== 'LEARNER') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-3 flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/5"
    >
      <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-400">
          AI features temporarily unavailable
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your organization&apos;s AI budget has been reached. Existing learning
          paths and progress remain accessible. Contact your manager to resume
          AI-powered features.
        </p>
      </div>
    </motion.div>
  );
}
