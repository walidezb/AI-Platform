import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/api-server';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserButton } from '@clerk/nextjs';
import { Badge } from '@/components/ui/badge';
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
    user = await serverFetch<User>('/auth/me');
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

  const sidebarFooter = (
    <div className="flex items-center gap-3 w-full">
      <div className="flex items-center justify-center border-r border-slate-900 pr-2 shrink-0">
        <UserButton />
      </div>
      <div className="flex-grow min-w-0">
        <p className="text-xs font-bold text-white truncate leading-none">{user.fullName}</p>
        <Badge variant="secondary" className="text-[8px] uppercase tracking-widest font-black px-1.5 py-0 bg-slate-950 border-slate-900 mt-1.5 text-primary leading-none">
          {user.role === 'ORG_ADMIN' || user.role === 'PLATFORM_ADMIN' ? 'Admin' : 'Manager'}
        </Badge>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      navItems={navItems}
      pageTitle="Manager Portal"
      breadcrumb={['Manager', 'Dashboard']}
      sidebarFooter={sidebarFooter}
    >
      {children}
    </DashboardLayout>
  );
}
