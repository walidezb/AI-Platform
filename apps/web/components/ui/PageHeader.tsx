import React from 'react';
import { Badge } from './badge';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  badge?: string;
}

export function PageHeader({ title, subtitle, action, badge }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
      <div>
        {badge && <Badge className="mb-2" variant="secondary">{badge}</Badge>}
        <h1 className="font-heading text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
          {title}
        </h1>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm sm:text-base">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
    </div>
  );
}
