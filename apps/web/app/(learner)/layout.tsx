import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { serverFetch } from '@/lib/api-server';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LearnerProgressSyncWrapper } from '@/components/learner/LearnerProgressSyncWrapper';
import { BudgetExceededBanner } from '@/components/BudgetExceededBanner';
import { MobileBottomNav } from '@/components/learner/MobileBottomNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { getTranslations } from 'next-intl/server';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'LEARNER' | 'MANAGER' | 'ORG_ADMIN' | 'PLATFORM_ADMIN';
  avatarUrl: string | null;
  experienceLevel?: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    planTier: string;
  } | null;
  activePath?: {
    id: string;
  } | null;
}

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  let user: User | null = null;
  try {
    const res = await serverFetch<{ success: boolean; data: User }>('/auth/me');
    user = res.data;
  } catch (err) {
    console.error('Error fetching user in LearnerLayout:', err);
    redirect('/sign-in');
  }

  // Role-based redirect for managers/admins
  if (user?.role === 'MANAGER' || user?.role === 'ORG_ADMIN') {
    redirect('/manage/dashboard');
  }

  const tNav = await getTranslations('nav');

  const navItems = [
    {
      label: tNav('dashboard'),
      href: '/learn/dashboard',
      icon: 'LayoutDashboard' as const,
    },
    {
      label: tNav('myPath'),
      href: `/learn/path/${user?.activePath?.id || ''}`,
      icon: 'Map' as const,
    },
    {
      label: tNav('settings'),
      href: '/learn/settings',
      icon: 'Settings' as const,
    },
  ];

  return (
    <LearnerProgressSyncWrapper>
      <DashboardLayout
        navItems={navItems}
        pageTitle="Learner Portal"
        breadcrumb={['Learner', 'Dashboard']}
        org={
          user?.organization || {
            name: 'Your Learning Workspace',
            logoUrl: null,
            planTier: 'STARTER',
          }
        }
        user={user || { fullName: 'Learner', role: 'LEARNER' }}
      >
        <div className="pb-20 md:pb-0">
          <BudgetExceededBanner />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
        <MobileBottomNav />
      </DashboardLayout>
    </LearnerProgressSyncWrapper>
  );
}
