import React from 'react';
import { serverFetch } from '@/lib/api-server';
import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardView } from './DashboardView';

interface User {
  id: string;
  fullName: string;
  role: 'LEARNER' | 'MANAGER' | 'ORG_ADMIN' | 'PLATFORM_ADMIN';
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export default async function DashboardPage() {
  // Ensure authenticated
  await requireAuth();

  // Fetch current user
  let user: User;
  try {
    user = await serverFetch<User>('/auth/me');
  } catch (err) {
    console.error('Error fetching user profile in DashboardPage:', err);
    redirect('/sign-in');
  }

  // Double check gate (should be handled by layout but good for direct route safety)
  if (user.role === 'LEARNER') {
    redirect('/learn/dashboard');
  }

  return <DashboardView user={user} />;
}
