'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BeginButtonProps {
  token: string;
  isReturning: boolean;
}

export function BeginButton({ token, isReturning }: BeginButtonProps) {
  const router = useRouter();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const handleBegin = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      // 1. Mark token opened
      await fetch(`${apiUrl}/invitations/validate/${token}/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 2. Sync Clerk user to DB before proceeding
      if (user?.id) {
        const syncRes = await fetch(`${apiUrl}/auth/sync-learner`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            avatarUrl: user.imageUrl,
            token,
          }),
        });

        if (!syncRes.ok) {
          throw new Error('Failed to synchronize user profile');
        }
      }

      router.push(`/onboarding/${token}/assessment`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(
        "We couldn't start your assessment. Please try again.",
        {
          description: process.env.NODE_ENV === 'development' ? message : undefined,
          action: {
            label: 'Retry',
            onClick: handleBegin,
          },
          duration: 8000,
        }
      );
      setIsLoading(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleBegin}
      disabled={isLoading}
      className={cn(
        "w-full py-4 px-6 rounded-xl font-semibold text-base select-none",
        "bg-gradient-primary text-white",
        "shadow-glow-sm hover:shadow-glow-md",
        "transition-all duration-200",
        "flex items-center justify-center gap-2 cursor-pointer",
        isLoading && "opacity-80 cursor-not-allowed"
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin shrink-0" />
          Setting up your profile...
        </>
      ) : (
        <>
          {isReturning ? 'Continue Assessment' : 'Begin My Assessment'}
          <ArrowRight className="h-5 w-5 shrink-0" />
        </>
      )}
    </motion.button>
  );
}
