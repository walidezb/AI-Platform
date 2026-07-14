'use client';

import React, { useEffect, useState } from 'react';
import { Cpu, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface FeatureUsage {
  feature: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: string;
}

interface UsageData {
  byFeature: FeatureUsage[];
  totalCostUsd: string;
  tokensUsed: number;
  tokensBudget: number;
  budgetUsedPct: number;
}

const FEATURE_ICONS: Record<string, string> = {
  ASSESSMENT: '🤖',
  PATH_GENERATION: '🗺️',
  RESOURCE_CURATION: '🌐',
  QUIZ_EVALUATION: '✏️',
};

export function BudgetWidget() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch('/api/usage/budget');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setUsage(json.data);
          }
        }
      } catch (err) {
        console.error('Error fetching usage:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!usage) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        Failed to load AI usage details.
      </Card>
    );
  }

  const budgetPct = Math.min(100, Math.max(0, usage.budgetUsedPct));

  return (
    <Card className="p-6 bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2 text-white">
          <Cpu className="h-4 w-4 text-indigo-400" />
          AI Usage This Month
        </h3>
        <Badge
          variant={
            budgetPct >= 90
              ? 'destructive'
              : budgetPct >= 70
              ? 'outline'
              : 'secondary'
          }
        >
          {budgetPct}% used
        </Badge>
      </div>

      {/* Budget progress bar wrapper */}
      <div className="mb-4">
        <ProgressBar
          value={budgetPct}
          variant={budgetPct >= 90 ? 'warning' : 'default'}
          animated
          showPercentage
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <p className="text-slate-400">Tokens Used</p>
          <p className="font-semibold text-white">
            {(usage.tokensUsed / 1000).toFixed(1)}K /{' '}
            {(usage.tokensBudget / 1000000).toFixed(1)}M
          </p>
        </div>
        <div>
          <p className="text-slate-400">Estimated Cost</p>
          <p className="font-semibold text-white">${usage.totalCostUsd}</p>
        </div>
      </div>

      {/* Feature breakdown */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">By Feature</p>
        {usage.byFeature && usage.byFeature.length > 0 ? (
          usage.byFeature.map((f) => (
            <div key={f.feature} className="flex items-center justify-between text-sm text-slate-300">
              <span className="flex items-center gap-2">
                <span>{FEATURE_ICONS[f.feature] || '⚙️'}</span>
                <span className="capitalize">
                  {f.feature.toLowerCase().replace('_', ' ')}
                </span>
                <span className="text-slate-500 text-xs">({f.calls} calls)</span>
              </span>
              <span className="font-medium text-white">${f.costUsd}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500">No AI usage recorded yet.</p>
        )}
      </div>
    </Card>
  );
}
export default BudgetWidget;
