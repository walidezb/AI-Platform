'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [isLoading, setIsLoading] = useState(false);

  const handleBegin = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/invitations/validate/${token}/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to mark token as opened');
      }

      router.push(`/onboarding/${token}/assessment`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to initialize onboarding session. Please try again.');
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
          Preparing your session...
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
