'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { BookOpen, ExternalLink, FileText, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { createApiClient } from '@/lib/api-client';

export interface SuggestedResourceItem {
  id: string;
  title: string;
  url: string;
  resourceType: string;
  sourcePlatform: string;
  qualityScore: number;
}

export function SuggestedResources({ milestoneId }: { milestoneId: string }) {
  const { getToken } = useAuth();

  const { data } = useQuery({
    queryKey: ['milestone-resources', milestoneId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{
        success: boolean;
        data: SuggestedResourceItem[];
      }>(`/paths/milestones/${milestoneId}/top-resources`);
      return res;
    },
    enabled: !!milestoneId,
    select: (res) => res.data,
  });

  if (!data?.length) return null;

  return (
    <Card className="p-5 border-amber-500/20 bg-amber-500/5">
      <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
        <BookOpen className="h-3.5 w-3.5" />
        Suggested Resources to Review
      </p>
      <div className="space-y-2">
        {data.slice(0, 3).map((r: SuggestedResourceItem) => (
          <a
            key={r.id}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
          >
            <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
              {r.resourceType === 'VIDEO' ? (
                <Play className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {r.title}
              </p>
              <p className="text-xs text-muted-foreground">{r.sourcePlatform}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
    </Card>
  );
}
