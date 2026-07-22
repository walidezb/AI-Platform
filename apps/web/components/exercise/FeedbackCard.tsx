'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export function FeedbackCard({ feedback }: { feedback: string }) {
  const lines = feedback.split('\n').filter(Boolean);

  return (
    <Card className="p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5 text-primary" />
        AI Feedback
      </p>
      <div className="space-y-2 text-sm leading-relaxed">
        {lines.map((line, i) => {
          const isStrength =
            line.startsWith('✓') || line.includes('**What you did well');
          const isImprovement =
            line.startsWith('→') || line.includes('**Areas to improve');
          const isNote = line.startsWith('💡');
          const isHeading = line.startsWith('**');

          return (
            <p
              key={i}
              className={cn(
                isStrength && 'text-emerald-400',
                isImprovement && 'text-amber-400',
                isNote && 'text-primary italic',
                isHeading && 'font-semibold text-foreground mt-3',
                !isStrength &&
                  !isImprovement &&
                  !isNote &&
                  !isHeading &&
                  'text-muted-foreground',
              )}
            >
              {line.replace(/\*\*/g, '')}
            </p>
          );
        })}
      </div>
    </Card>
  );
}
