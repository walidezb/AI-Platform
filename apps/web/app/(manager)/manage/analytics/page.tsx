'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Review aggregate dashboard metrics and progress graphs"
        action={<Button className="bg-gradient-primary border-0 text-white font-semibold">Export Report</Button>}
      />
      <EmptyState
        icon={BarChart3}
        title="No analytic graphs"
        description="Analytic patterns populate once employees start paths"
        action={{ label: 'Review Dashboard', onClick: () => {} }}
      />
    </div>
  );
}
