'use client';

import React from 'react';
import { Sidebar, NavItem } from './Sidebar';
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
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar Panel */}
      <Sidebar items={navItems} org={org} user={user} />

      {/* Main Container */}
      <div className="flex flex-grow flex-col overflow-hidden md:pl-64">
        {/* TopBar Header */}
        <TopBar title={pageTitle} breadcrumb={breadcrumb} />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-950/20">
          <div className="max-w-7xl mx-auto fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
