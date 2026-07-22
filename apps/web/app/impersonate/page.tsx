'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function ImpersonateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [role, setRole] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace('/admin/dashboard');
      return;
    }

    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      setRole(payload.role || 'ORG_ADMIN');
    } catch {
      router.replace('/admin/dashboard');
    }
  }, [token, router]);

  const enter = () => {
    if (!token) return;
    setEntering(true);
    sessionStorage.setItem('impersonation_token', token);
    router.push('/manage/dashboard');
  };

  return (
    <Card className="w-full max-w-sm p-6 text-center space-y-5">
      <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
        <ShieldAlert className="h-7 w-7 text-amber-400" />
      </div>

      <div>
        <h1 className="text-lg font-bold">Impersonating Organization</h1>
        <p className="text-sm text-muted-foreground mt-1">
          You are about to enter as a{' '}
          <strong className="text-foreground">{role}</strong> in this
          organization.
        </p>
      </div>

      <div className="p-3 rounded-xl bg-secondary/50 border border-amber-500/20 text-left">
        <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
          ⚠️ Impersonation Session
        </p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• This session expires in 1 hour</li>
          <li>• All actions are logged to the audit trail</li>
          <li>• You are NOT the actual user — act responsibly</li>
        </ul>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push('/admin/dashboard')}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          disabled={entering || !token}
          onClick={enter}
        >
          {entering ? 'Entering...' : 'Enter Org →'}
        </Button>
      </div>
    </Card>
  );
}

export default function ImpersonatePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Suspense fallback={<Card className="w-full max-w-sm p-6 text-center text-sm text-muted-foreground">Loading session...</Card>}>
        <ImpersonateContent />
      </Suspense>
    </div>
  );
}
