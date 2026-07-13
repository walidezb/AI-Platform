import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/api-server';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  BarChart3, 
  Settings 
} from 'lucide-react';

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

  const navItems = [
    { label: 'Dashboard',   href: '/manage/dashboard',   icon: LayoutDashboard },
    { label: 'My Team',     href: '/manage/team',        icon: Users },
    { label: 'Invitations', href: '/manage/invitations', icon: Mail },
    { label: 'Analytics',   href: '/manage/analytics',   icon: BarChart3 },
    { label: 'Settings',    href: '/manage/settings',    icon: Settings },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      pageTitle="Manager Portal"
      breadcrumb={['Manager', 'Dashboard']}
      org={user.organization || { name: 'Your Workspace', logoUrl: null, planTier: 'STARTER' }}
      user={user}
    >
      {children}
    </DashboardLayout>
  );
}
