'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Map, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const NAV_ITEMS = [
  { label: 'dashboard', icon: LayoutDashboard, href: '/learn/dashboard' },
  { label: 'myPath', icon: Map, href: '/learn/path' },
  { label: 'settings', icon: Settings, href: '/learn/settings' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    /* Only show on mobile — hidden on md+ */
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border flex items-center justify-around px-2 pt-2 pb-safe md:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== '/learn/dashboard' && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] px-3 py-1 rounded-xl transition-colors relative"
          >
            <div
              className={cn(
                'h-5 w-5 flex items-center justify-center transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span
              className={cn(
                'text-[10px] font-medium leading-none',
                isActive ? 'text-primary font-semibold' : 'text-muted-foreground',
              )}
            >
              {t(item.label as 'dashboard' | 'myPath' | 'settings')}
            </span>
            {/* Active dot indicator */}
            {isActive && (
              <motion.div
                layoutId="bottom-nav-dot"
                className="h-1 w-1 rounded-full bg-primary absolute bottom-0.5"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
