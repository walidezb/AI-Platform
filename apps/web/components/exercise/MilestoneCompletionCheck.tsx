'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { createApiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface MilestoneCompletionCheckProps {
  milestoneId: string;
}

export function MilestoneCompletionCheck({
  milestoneId,
}: MilestoneCompletionCheckProps) {
  const { getToken } = useAuth();
  const [isComplete, setIsComplete] = useState(false);

  // Check milestone progress
  const { data } = useQuery({
    queryKey: ['milestone-progress', milestoneId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{
        success: boolean;
        data: { isComplete: boolean };
      }>(`/progress/milestone/${milestoneId}`);
      return res;
    },
    refetchInterval: 3000, // poll every 3s
    refetchIntervalInBackground: false,
    select: (res) => res.data,
  });

  useEffect(() => {
    if (data?.isComplete && !isComplete) {
      setIsComplete(true);
    }
  }, [data, isComplete]);

  if (!isComplete) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      <Card className="p-5 border-violet-500/30 bg-violet-500/5 text-center">
        <div className="text-3xl mb-2">🎓</div>
        <p className="font-semibold text-violet-400 mb-1">
          Milestone Complete!
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          You&apos;ve finished everything in this milestone. See your results!
        </p>
        <Link
          href={`/learn/milestone/${milestoneId}/complete`}
          className={cn(
            buttonVariants(),
            'w-full bg-gradient-to-r from-violet-600 to-indigo-600 shadow-glow-sm',
          )}
        >
          View Milestone Summary →
        </Link>
      </Card>
    </motion.div>
  );
}
