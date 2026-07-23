import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type AiUnavailableProps = {
  type: 'assessment' | 'path-generation' | 'exercise';
  onRetry?: () => void;
};

const CONFIGS = {
  assessment: {
    icon: '🤖',
    title: 'AI Service Temporarily Unavailable',
    desc: "We're having trouble connecting to the AI assessment service. Please try again in a few moments.",
    action: 'Retry Assessment',
    color: 'text-amber-400',
  },
  'path-generation': {
    icon: '⏳',
    title: 'Path Generation Taking Longer Than Usual',
    desc: "Your personalized path is taking longer to generate. We'll send you an email when it's ready.",
    action: null,
    color: 'text-primary',
  },
  exercise: {
    icon: '💾',
    title: 'Evaluation Temporarily Unavailable',
    desc: 'Your answer has been saved. AI evaluation failed but you can retry when the service recovers.',
    action: 'Try Evaluation Again',
    color: 'text-amber-400',
  },
};

export function AiUnavailableState({ type, onRetry }: AiUnavailableProps) {
  const cfg = CONFIGS[type];

  return (
    <div className="flex flex-col items-center gap-4 py-12 px-8 text-center">
      <div className="text-5xl">{cfg.icon}</div>

      <div>
        <h3 className={cn('text-base font-semibold mb-2', cfg.color)}>
          {cfg.title}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">{cfg.desc}</p>
      </div>

      {cfg.action && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 inline me-1.5" />
          {cfg.action}
        </button>
      )}

      {type === 'path-generation' && (
        <p className="text-xs text-muted-foreground">
          📬 We&apos;ll email you at{' '}
          <strong className="text-foreground">your@email.com</strong> when your
          path is ready.
        </p>
      )}
    </div>
  );
}
