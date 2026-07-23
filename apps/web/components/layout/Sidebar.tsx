'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  BarChart3, 
  Settings,
  Map,
  BookOpen,
  Award,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { UserButton } from '@clerk/nextjs';

export const ICON_MAP = {
  dashboard: LayoutDashboard,
  users: Users,
  mail: Mail,
  analytics: BarChart3,
  settings: Settings,
  map: Map,
  bookOpen: BookOpen,
  award: Award,
  billing: CreditCard,
  CreditCard: CreditCard,
  LayoutDashboard: LayoutDashboard,
  Map: Map,
  Settings: Settings,
};

export interface NavItem {
  label: string;
  href: string;
  icon: keyof typeof ICON_MAP;
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
    experienceLevel?: string;
  };
}

export function SidebarContent({ items, org, user, onItemClick }: SidebarProps & { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar header (top, above nav) */}
      <div className="flex h-16 items-center gap-3 px-4 py-3 border-b border-border">
        {org.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
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
          <p className="font-semibold text-sm truncate text-foreground leading-normal">{org.name}</p>
          <p className="text-xs text-muted-foreground capitalize leading-none mt-0.5">
            {org.planTier.toLowerCase()} plan
          </p>
        </div>
      </div>

      {/* Nav Items List */}
      <nav className="flex-grow space-y-1.5 px-4 py-6 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = ICON_MAP[item.icon] || LayoutDashboard;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={onItemClick}
              className={cn(
                "group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 select-none relative",
                isActive
                  ? "bg-primary/10 text-primary shadow-glow-sm border-s-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
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
      <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <UserButton />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground leading-normal">{user.fullName}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground capitalize leading-none">
                {user.role.toLowerCase().replace('_', ' ')}
              </span>
              {user.experienceLevel && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 border-primary/30 text-primary font-extrabold uppercase shrink-0 leading-none">
                  {user.experienceLevel.toLowerCase()}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 border-e border-border bg-card flex-col lg:flex">
      <SidebarContent {...props} />
    </aside>
  );
}
