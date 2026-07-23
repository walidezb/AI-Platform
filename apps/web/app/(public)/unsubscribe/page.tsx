import React from 'react';
import Link from 'next/link';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageProps {
  searchParams: Promise<{ token?: string; userId?: string }>;
}

export async function generateMetadata() {
  return {
    title: 'Unsubscribe | LearnPath AI',
    robots: { index: false, follow: false },
  };
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { token, userId } = await searchParams;

  let success = false;
  let error = '';

  if (token && userId) {
    try {
      const apiUrl = process.env.API_URL || 'http://localhost:4000';
      const res = await fetch(
        `${apiUrl}/notifications/unsubscribe?token=${token}&userId=${userId}`,
        { cache: 'no-store' },
      );
      success = res.ok;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        error = data.message || 'The unsubscribe link is invalid or has expired.';
      }
    } catch {
      error = 'Failed to process unsubscribe request.';
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900/60 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
        {success ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="h-8 w-8 shrink-0" />
            </div>
            <h1 className="font-heading text-2xl font-bold">Unsubscribed</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              You have been unsubscribed from email notifications. You can re-enable them anytime in your settings.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="h-8 w-8 shrink-0" />
            </div>
            <h1 className="font-heading text-2xl font-bold">Invalid Link</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              {error || 'This unsubscribe link is invalid or has already been used.'}
            </p>
          </>
        )}
        <div className="pt-2">
          <Link href="/">
            <Button variant="outline" className="bg-slate-950 border-slate-800 text-white font-semibold text-xs">
              Go to Homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
