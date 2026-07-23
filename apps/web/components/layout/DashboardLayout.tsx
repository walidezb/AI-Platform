'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Sidebar, SidebarContent, NavItem } from './Sidebar';
import { TopBar } from './TopBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  pageTitle: string;
  breadcrumb?: string[];
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

export function DashboardLayout({
  children,
  navItems,
  pageTitle,
  breadcrumb,
  org,
  user,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar Panel */}
      <Sidebar items={navItems} org={org} user={user} />

      {/* Mobile Slide-over Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 start-0 z-50 w-64 bg-card border-e border-border flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between px-4 h-16 border-b border-border">
                <div className="flex items-center gap-3">
                  {org.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={org.logoUrl} alt={org.name} className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-sm font-bold">
                      {org.name ? org.name[0].toUpperCase() : 'O'}
                    </div>
                  )}
                  <span className="font-semibold text-sm truncate text-foreground">{org.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50 cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent items={navItems} org={org} user={user} onItemClick={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="flex flex-grow flex-col overflow-hidden lg:ps-64">
        {/* TopBar Header */}
        <TopBar
          title={pageTitle}
          breadcrumb={breadcrumb}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-950/20">
          <div className="max-w-7xl mx-auto fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
