'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, disabled = false, className, id }, ref) => {
    return (
      <div className="relative inline-flex items-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="peer sr-only"
        />
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onCheckedChange?.(!checked)}
          className={cn(
            'h-4 w-4 shrink-0 rounded-sm border border-slate-700 bg-slate-950 text-white shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center transition-colors',
            checked && 'bg-indigo-600 border-indigo-600 text-white',
            className,
          )}
        >
          {checked && <Check className="h-3 w-3 text-white stroke-[3]" />}
        </button>
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';
