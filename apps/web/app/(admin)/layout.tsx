'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  ShieldCheck,
  BarChart2,
  Building2,
  DollarSign,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function FullPageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0d0d14]">
      <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
    </div>
  );
}

function AdminNavItem({
  label,
  icon,
  href,
}: {
  label: string;
  icon: React.ReactNode;
  href: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-rose-500/15 text-rose-400 font-semibold'
          : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground',
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Gate: redirect non-platform-admins
  useEffect(() => {
    if (!isLoaded) return;
    const role = user?.publicMetadata?.role as string;
    if (role !== 'PLATFORM_ADMIN') {
      router.replace('/');
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) return <FullPageSpinner />;
  const role = user?.publicMetadata?.role as string;
  if (role !== 'PLATFORM_ADMIN') return <FullPageSpinner />;

  const NAV = [
    {
      label: 'Platform Overview',
      icon: <BarChart2 className="h-4 w-4" />,
      href: '/admin/dashboard',
    },
    {
      label: 'Organizations',
      icon: <Building2 className="h-4 w-4" />,
      href: '/admin/organizations',
    },
    {
      label: 'AI Costs',
      icon: <DollarSign className="h-4 w-4" />,
      href: '/admin/ai-costs',
    },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Admin sidebar — distinctive dark red accent ── */}
      <aside className="w-56 border-r border-border bg-[#0d0d14] flex flex-col shrink-0">
        {/* Logo + badge */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-rose-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Admin Portal</p>
              <p className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">
                Platform Admin
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <AdminNavItem key={item.href} {...item} />
          ))}
        </nav>

        {/* Bottom: back to app */}
        <div className="p-3 border-t border-border">
          <Link
            href="/manage/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-secondary/50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto bg-slate-950/20">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
