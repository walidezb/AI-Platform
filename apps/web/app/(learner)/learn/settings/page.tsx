import React from 'react';
import { Settings } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function LearnerSettingsPage() {
  return (
    <div className="p-6">
      <PageHeader title="Settings" subtitle="Manage your profile" />
      <EmptyState
        icon={Settings}
        title="Learner settings — coming soon"
        description=""
      />
    </div>
  );
}
