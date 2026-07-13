import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  hideText?: boolean;
}

export function Logo({ size = 'md', className, hideText = false }: LogoProps) {
  const iconSizes = {
    sm: 18,
    md: 26,
    lg: 38,
  };

  const containerSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const textSizes = {
    sm: 'text-sm tracking-wider font-extrabold',
    md: 'text-lg tracking-widest font-black',
    lg: 'text-2xl tracking-widest font-black',
  };

  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div className={cn("relative shrink-0 flex items-center justify-center bg-slate-950/20 rounded-md border border-slate-800/40", containerSizes[size])}>
        <Image
          src="/logo-icon.png"
          alt="EZ LEARN"
          width={iconSizes[size]}
          height={iconSizes[size]}
          className="object-contain"
          priority
        />
      </div>
      {!hideText && (
        <span className={cn("font-heading text-white leading-none uppercase", textSizes[size])}>
          EZ <span className="bg-gradient-primary bg-clip-text text-transparent">LEARN</span>
        </span>
      )}
    </div>
  );
}
