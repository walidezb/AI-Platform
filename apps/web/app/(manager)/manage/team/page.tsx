'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Team"
        subtitle="Manage your employees and their learning progress"
        action={<Button className="bg-gradient-primary border-0 text-white font-semibold">Invite Employee</Button>}
      />
      <EmptyState
        icon={Users}
        title="No team members yet"
        description="Invite your first employee to get started"
        action={{ label: 'Send Invitations', onClick: () => {} }}
      />
    </div>
  );
}
