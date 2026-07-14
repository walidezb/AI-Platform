'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <Button
      onClick={handleBegin}
      disabled={isLoading}
      className="w-full bg-gradient-primary border-0 text-white font-bold h-11 text-sm rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-glow-sm"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
          Initializing...
        </>
      ) : (
        <>
          {isReturning ? 'Continue Assessment' : 'Begin Your Assessment'}
          <ArrowRight className="h-4 w-4 ml-2 shrink-0" />
        </>
      )}
    </Button>
  );
}
