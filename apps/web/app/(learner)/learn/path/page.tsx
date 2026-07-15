'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Map } from 'lucide-react';

export default function LearnerPathPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Learning Path" subtitle="Your personalized AI-generated curriculum" />
      <EmptyState icon={Map} title="Path loading..." description="Step 3.2" />
    </div>
  );
}
