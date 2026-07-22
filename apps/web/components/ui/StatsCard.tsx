import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from './AnimatedNumber';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  subValue?: React.ReactNode;
  trend?: { value: number; label: string };
  trendText?: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
  isLoading?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function StatsCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  subValue,
  trend,
  trendText,
  variant = 'default',
  isLoading = false,
  children,
  className,
}: StatsCardProps) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    info: 'bg-info/10 text-info border-info/20',
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border shimmer min-h-[128px]">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
          </div>
          <div className="h-8 w-24 bg-muted rounded mb-2 animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const isStringNumeric = typeof value === 'string' && !isNaN(parseFloat(value.replace(/[^0-9.-]/g, '')));
  const isNumeric = typeof value === 'number' || isStringNumeric;

  let renderValue: React.ReactNode = value;
  if (isNumeric && !isLoading) {
    const num = typeof value === 'number' ? value : parseFloat(value.replace(/[^0-9.-]/g, ''));
    let prefix = '';
    let suffix = '';
    if (typeof value === 'string') {
      if (value.includes('%')) suffix = '%';
      if (value.includes('$')) prefix = '$';
    }
    renderValue = (
      <AnimatedNumber 
        value={num} 
        prefix={prefix} 
        suffix={suffix} 
      />
    );
  }

  return (
    <Card className={cn("bg-card border-border hover:border-primary/20 card-hover transition-all duration-200", className)}>
      <CardContent className="p-6 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-4">
          <div className="text-muted-foreground text-sm font-medium tracking-tight">
            {label}
          </div>
          <div className={cn(
            "p-2.5 rounded-lg border flex items-center justify-center shrink-0",
            iconBg && iconColor ? cn(iconBg, iconColor, "border-transparent") : variantStyles[variant]
          )}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
        <div>
          <div className="font-heading text-3xl font-bold tracking-tight text-foreground mb-2 fade-in">
            {renderValue}
          </div>
          {subValue && (
            <div className="text-xs text-muted-foreground mt-1 select-none">
              {subValue}
            </div>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <span className={cn(
                "font-semibold",
                trend.value >= 0 ? "text-success" : "text-destructive"
              )}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span>{trend.label}</span>
            </div>
          )}
          {trendText && (
            <div className="text-xs text-muted-foreground mt-1 select-none">
              {trendText}
            </div>
          )}
          {children && (
            <div className="mt-3">
              {children}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
