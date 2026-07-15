'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookOpen } from 'lucide-react';

export default function LearnerMilestonePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Milestone" />
      <EmptyState icon={BookOpen} title="Milestone detail — Step 3.3" description="" />
    </div>
  );
}
