import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface PathHeaderProps {
  path: {
    title: string;
    description: string;
    domain: string;
    status: string;
    totalMilestones: number;
    estimatedHours: number;
    completedMilestones: number;
    overallCompletionPct: number;
    milestones: Array<{
      modules: Array<unknown>;
    }>;
  };
}

export function PathHeader({ path }: PathHeaderProps) {
  const totalModules = path.milestones.reduce(
    (sum, m) => sum + m.modules.length,
    0,
  );

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/learn/dashboard"
          className="hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">My Path</span>
      </div>

      {/* Title + domain */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-xs">
            {path.domain}
          </Badge>
          <Badge
            variant={path.status === 'COMPLETED' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {path.status === 'COMPLETED' ? '✅ Completed' : '🔄 In Progress'}
          </Badge>
        </div>
        <h1 className="font-heading text-2xl font-bold">{path.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{path.description}</p>
      </div>

      {/* Overall progress bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm font-bold text-primary">
            {path.overallCompletionPct}%
          </span>
        </div>
        <ProgressBar
          value={path.overallCompletionPct}
          animated
          className="h-2.5"
        />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-lg font-bold">
              {path.completedMilestones}
              <span className="text-muted-foreground font-normal text-sm">
                /{path.totalMilestones}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Milestones</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">~{path.estimatedHours}h</p>
            <p className="text-xs text-muted-foreground">Estimated</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{totalModules}</p>
            <p className="text-xs text-muted-foreground">Modules</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
