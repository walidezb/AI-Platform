import React from 'react';
import { Menu } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { NotificationBell } from './NotificationBell';
import { BudgetWarningIcon } from './BudgetWarningIcon';
import { LanguageSwitcher } from '../LanguageSwitcher';

interface TopBarProps {
  title: string;
  breadcrumb?: string[];
  onOpenSidebar?: () => void;
}

export function TopBar({ title, breadcrumb, onOpenSidebar }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-border bg-card/85 backdrop-blur-md flex items-center justify-between px-4 lg:px-8">
      {/* Left: Hamburger (mobile) + Breadcrumbs / Title */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground select-none min-w-0">
        {onOpenSidebar && (
          <button
            type="button"
            className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0 cursor-pointer"
            onClick={onOpenSidebar}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {breadcrumb && breadcrumb.length > 0 ? (
          <div className="flex items-center gap-2 truncate">
            {breadcrumb.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span>/</span>}
                <span className={idx === breadcrumb.length - 1 ? "text-foreground font-semibold truncate" : "hover:text-foreground transition-colors truncate"}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
        ) : (
          <h2 className="text-base sm:text-lg font-bold text-foreground font-heading truncate">{title}</h2>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Budget Warning Icon */}
        <BudgetWarningIcon />

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Button Profile */}
        <div className="border-s border-border ps-3 py-1 flex items-center justify-center">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
