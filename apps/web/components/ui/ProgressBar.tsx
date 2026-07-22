'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning';
  animated?: boolean; // animate fill on mount
  className?: string;
}

export function ProgressBar({
  value,
  label,
  showPercentage = false,
  size = 'md',
  variant = 'default',
  animated = true,
  className,
}: ProgressBarProps) {
  const [width, setWidth] = useState(animated ? 0 : value);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setWidth(value);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setWidth(value);
    }
  }, [value, animated]);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const fillGradients = {
    default: 'from-primary to-indigo-500 bg-gradient-to-r',
    success: 'from-emerald-600 to-teal-400 bg-gradient-to-r',
    warning: 'from-amber-600 to-orange-400 bg-gradient-to-r',
  };

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1.5 text-sm">
          {label && <span className="text-muted-foreground font-medium">{label}</span>}
          {showPercentage && <span className="text-foreground font-semibold">{Math.round(value)}%</span>}
        </div>
      )}
      <div className={cn("w-full bg-muted border border-border/50 rounded-full overflow-hidden", sizeClasses[size])}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out relative",
            fillGradients[variant]
          )}
          style={{ width: `${width}%` }}
        >
          {/* End glow effect */}
          {width > 0 && (
            <div className="absolute right-0 top-0 bottom-0 w-2.5 rounded-full bg-white opacity-40 blur-xs" />
          )}
        </div>
      </div>
    </div>
  );
}
