'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Play } from 'lucide-react';

export default function LearnerModulePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Module" />
      <EmptyState icon={Play} title="Module viewer — Step 3.4" description="" />
    </div>
  );
}
