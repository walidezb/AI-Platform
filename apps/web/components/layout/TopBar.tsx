import React from 'react';
import { Bell } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

interface TopBarProps {
  title: string;
  breadcrumb?: string[];
  unreadNotificationsCount?: number;
}

export function TopBar({ title, breadcrumb, unreadNotificationsCount = 0 }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-border bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-8">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground select-none">
        {breadcrumb && breadcrumb.length > 0 ? (
          <div className="flex items-center gap-2">
            {breadcrumb.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span>/</span>}
                <span className={idx === breadcrumb.length - 1 ? "text-white font-semibold" : "hover:text-white transition-colors"}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
        ) : (
          <h2 className="text-lg font-bold text-white font-heading">{title}</h2>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button className="relative p-2 text-muted-foreground hover:text-white transition-colors hover:bg-slate-900 rounded-lg">
          <Bell className="h-5 w-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white leading-none">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* User Button Profile */}
        <div className="border-l border-slate-800 pl-4 py-1 flex items-center justify-center">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
