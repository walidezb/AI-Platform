'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { UserButton } from '@clerk/nextjs';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface SidebarProps {
  items: NavItem[];
  org: {
    name: string;
    logoUrl: string | null;
    planTier: string;
  };
  user: {
    fullName: string;
    role: string;
  };
}

export function Sidebar({ items, org, user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-slate-950 flex-col md:flex">
      {/* Sidebar header (top, above nav) */}
      <div className="flex h-16 items-center gap-3 px-4 py-3 border-b border-border">
        {org.logoUrl ? (
          <img
            src={org.logoUrl}
            alt={org.name}
            className="h-8 w-8 rounded-lg object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
            {org.name ? org.name[0].toUpperCase() : 'O'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate text-white leading-normal">{org.name}</p>
          <p className="text-xs text-muted-foreground capitalize leading-none mt-0.5">
            {org.planTier.toLowerCase()} plan
          </p>
        </div>
      </div>

      {/* Nav Items List */}
      <nav className="flex-grow space-y-1.5 px-4 py-6 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 select-none relative",
                isActive
                  ? "bg-primary/10 text-white shadow-glow-sm border-l-2 border-primary"
                  : "text-muted-foreground hover:text-white hover:bg-slate-900/60"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                <span className={cn(isActive && "bg-gradient-primary bg-clip-text text-transparent font-semibold")}>
                  {item.label}
                </span>
              </div>
              {item.badge !== undefined && (
                <Badge variant={isActive ? "default" : "secondary"} className="text-[10px] px-1.5 py-0.5 leading-none font-bold">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar footer (bottom, above UserButton) */}
      <div className="px-4 py-3 border-t border-border bg-slate-950/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <UserButton />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white leading-normal">{user.fullName}</p>
            <p className="text-xs text-muted-foreground capitalize leading-none mt-0.5">
              {user.role.toLowerCase().replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
