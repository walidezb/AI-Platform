import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void } | React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const isReactNode = React.isValidElement(action);

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 backdrop-blur-sm max-w-xl mx-auto my-6">
      <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-5 text-muted-foreground">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">{description}</p>
      {action && (
        isReactNode ? (
          action
        ) : (
          <Button onClick={(action as { onClick: () => void }).onClick} variant="default" className="shadow-md">
            {(action as { label: string }).label}
          </Button>
        )
      )}
    </div>
  );
}
