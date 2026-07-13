import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { serverFetch } from '@/lib/api-server';
import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsView } from './SettingsView';

interface User {
  id: string;
  fullName: string;
  role: 'LEARNER' | 'MANAGER' | 'ORG_ADMIN' | 'PLATFORM_ADMIN';
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    planTier: string;
  } | null;
}

export default async function SettingsPage() {
  // Ensure authenticated
  await requireAuth();

  // Fetch current user
  let user: User;
  try {
    user = await serverFetch<User>('/auth/me');
  } catch (err) {
    console.error('Error fetching user profile in SettingsPage:', err);
    redirect('/sign-in');
  }

  // Direct route safety
  if (user.role === 'LEARNER') {
    redirect('/learn/dashboard');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage organization workspace, structure, and billing details"
      />
      <SettingsView user={user} />
    </div>
  );
}
