import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/api-server';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { getTranslations } from 'next-intl/server';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'LEARNER' | 'MANAGER' | 'ORG_ADMIN' | 'PLATFORM_ADMIN';
  avatarUrl: string | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    planTier: string;
  } | null;
}

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Enforce auth
  await requireAuth();

  // 2. Fetch authenticated profile
  let user: User;
  try {
    const res = await serverFetch<{ success: boolean; data: User }>('/auth/me');
    user = res.data;
  } catch (err) {
    console.error('Error fetching user profile in ManagerLayout:', err);
    redirect('/sign-in');
  }

  // 3. Gate learners from accessing manager dashboard
  if (user.role === 'LEARNER') {
    redirect('/learn/dashboard');
  }

  const tNav = await getTranslations('nav');

  const navItems = [
    { label: tNav('dashboard'),   href: '/manage/dashboard',   icon: 'dashboard' as const },
    { label: tNav('team'),        href: '/manage/team',        icon: 'users' as const },
    { label: tNav('analytics'),   href: '/manage/analytics',   icon: 'analytics' as const },
    { label: tNav('invitations'), href: '/manage/invitations', icon: 'mail' as const },
    ...(user.role === 'ORG_ADMIN' || user.role === 'PLATFORM_ADMIN'
      ? [
          {
            label: tNav('billing'),
            href: '/manage/billing',
            icon: 'billing' as const,
          },
        ]
      : []),
    { label: tNav('settings'),    href: '/manage/settings',    icon: 'settings' as const },
  ];

  return (
    <>
      <ImpersonationBanner />
      <DashboardLayout
        navItems={navItems}
        pageTitle="Manager Portal"
        breadcrumb={['Manager', 'Dashboard']}
        org={user.organization || { name: 'Your Workspace', logoUrl: null, planTier: 'STARTER' }}
        user={user}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </DashboardLayout>
    </>
  );
}
