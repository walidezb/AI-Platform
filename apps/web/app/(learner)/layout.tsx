import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/api-server';
import { DashboardLayout } from '@/components/layout/DashboardLayout';


interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'LEARNER' | 'MANAGER' | 'ORG_ADMIN' | 'PLATFORM_ADMIN';
  avatarUrl: string | null;
  onboardingToken: string | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    planTier: string;
  } | null;
}

interface AssessmentSummary {
  identifiedRole: string | null;
  experienceLevel: string | null;
  strongAreas: string[];
  weakAreas: string[];
  learningGoals: string[];
  completedAt: string | null;
}

export default async function LearnerLayout({
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
    console.error('Error fetching user profile in LearnerLayout:', err);
    redirect('/sign-in');
  }

  // 3. Gate managers/org_admins to manager portal
  if (user.role === 'MANAGER' || user.role === 'ORG_ADMIN') {
    redirect('/manage/dashboard');
  }

  // 4. Force assessment completion if not already completed
  let assessment: AssessmentSummary | null = null;
  try {
    assessment = await serverFetch<AssessmentSummary | null>('/users/me/assessment');
  } catch (err) {
    console.error('Error fetching assessment in LearnerLayout:', err);
  }

  if (!assessment) {
    if (user.onboardingToken) {
      redirect(`/onboarding/${user.onboardingToken}`);
    } else {
      redirect('/onboarding/setup');
    }
  }

  const navItems = [
    { label: 'Dashboard',    href: '/learn/dashboard', icon: 'dashboard' as const },
    { label: 'My Path',      href: '/learn/path',      icon: 'map' as const },
    { label: 'Resources',    href: '/learn/path',      icon: 'bookOpen' as const },
    { label: 'Achievements', href: '/learn/dashboard', icon: 'award' as const },
    { label: 'Settings',     href: '/learn/settings',  icon: 'settings' as const },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      pageTitle="Learner Portal"
      breadcrumb={['Learner', 'Dashboard']}
      org={user.organization || { name: 'Your Workspace', logoUrl: null, planTier: 'STARTER' }}
      user={{
        fullName: user.fullName,
        role: user.role,
        experienceLevel: assessment?.experienceLevel || undefined,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
