import React from 'react';
import { UserButton } from '@clerk/nextjs';
import { NotificationBell } from './NotificationBell';
import { BudgetWarningIcon } from './BudgetWarningIcon';

interface TopBarProps {
  title: string;
  breadcrumb?: string[];
}

export function TopBar({ title, breadcrumb }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-border bg-card/85 backdrop-blur-md flex items-center justify-between px-6 lg:px-8">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground select-none">
        {breadcrumb && breadcrumb.length > 0 ? (
          <div className="flex items-center gap-2">
            {breadcrumb.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span>/</span>}
                <span className={idx === breadcrumb.length - 1 ? "text-foreground font-semibold" : "hover:text-foreground transition-colors"}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
        ) : (
          <h2 className="text-lg font-bold text-foreground font-heading">{title}</h2>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Budget Warning Icon */}
        <BudgetWarningIcon />

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Button Profile */}
        <div className="border-l border-border pl-4 py-1 flex items-center justify-center">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
