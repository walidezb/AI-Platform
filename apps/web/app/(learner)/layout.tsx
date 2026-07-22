import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { serverFetch } from '@/lib/api-server';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

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

  const navItems = [
    {
      label: 'Dashboard',
      href: '/learn/dashboard',
      icon: 'LayoutDashboard' as const,
    },
    {
      label: 'My Path',
      href: `/learn/path/${user?.activePath?.id || ''}`,
      icon: 'Map' as const,
    },
    {
      label: 'Settings',
      href: '/learn/settings',
      icon: 'Settings' as const,
    },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      pageTitle="Learner Portal"
      breadcrumb={['Learner', 'Dashboard']}
      org={user?.organization || { name: 'Your Learning Workspace', logoUrl: null, planTier: 'STARTER' }}
      user={user || { fullName: 'Learner', role: 'LEARNER' }}
    >
      {children}
    </DashboardLayout>
  );
}
