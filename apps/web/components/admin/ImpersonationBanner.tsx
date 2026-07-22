'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

export function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      !!sessionStorage.getItem('impersonation_token')
    ) {
      setIsImpersonating(true);
    }
  }, []);

  if (!isImpersonating) return null;

  return (
    <div className="bg-amber-500/90 text-black text-center text-xs font-semibold py-1.5 px-4 flex items-center justify-center gap-3 shadow-md z-50 relative">
      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
      <span>IMPERSONATION SESSION ACTIVE — You are acting as another user</span>
      <button
        onClick={() => {
          sessionStorage.removeItem('impersonation_token');
          window.location.href = '/admin/dashboard';
        }}
        className="underline underline-offset-2 hover:opacity-80 font-bold ml-2"
      >
        Exit
      </button>
    </div>
  );
}
