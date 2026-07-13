'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '../ui/Logo';
import { Badge } from '../ui/badge';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface SidebarProps {
  items: NavItem[];
  footer?: React.ReactNode;
}

export function Sidebar({ items, footer }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-slate-950 flex-col md:flex">
      {/* Top Header Logo */}
      <div className="flex h-16 items-center px-6 border-b border-border/60">
        <Link href="/manage/dashboard">
          <Logo size="md" />
        </Link>
      </div>

      {/* Nav Items List */}
      <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
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

      {/* Footer Area */}
      {footer && (
        <div className="p-4 border-t border-border/60 bg-slate-950/80 backdrop-blur-sm shrink-0">
          {footer}
        </div>
      )}
    </aside>
  );
}
