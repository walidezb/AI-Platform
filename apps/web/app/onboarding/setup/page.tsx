'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function OnboardingSetup() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const syncAttempted = useRef(false);

  const syncUser = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'New User',
          avatarUrl: user.imageUrl,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to sync user with database');
      }

      router.push('/manage/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (isLoaded && user && !syncAttempted.current) {
      syncAttempted.current = true;
      syncUser();
    }
  }, [isLoaded, user, syncUser]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 text-center shadow-2xl z-10">
        <h2 className="text-2xl font-bold text-white mb-4">Setting up your account...</h2>
        
        {loading && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Please wait while we configure your workspace</p>
          </div>
        )}

        {error && (
          <div className="space-y-6 py-4">
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-left">
              <strong>Error: </strong> {error}
            </div>
            <button
              onClick={() => {
                syncAttempted.current = false;
                syncUser();
              }}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25"
            >
              Retry Setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
