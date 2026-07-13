'use client';

import React from 'react';
import { CreditCard } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { DepartmentsManager } from '@/components/settings/DepartmentsManager';
import { OrgSettingsForm } from '@/components/settings/OrgSettingsForm';

interface User {
  id: string;
  fullName: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    planTier: string;
  } | null;
}

interface SettingsViewProps {
  user: User;
}

export function SettingsView({ user }: SettingsViewProps) {
  return (
    <div className="space-y-8 pb-12">
      <Tabs defaultValue="organization" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[500px] mb-8 bg-slate-900 border border-slate-800 p-1">
          <TabsTrigger value="organization" className="data-[state=active]:bg-primary/20 data-[state=active]:text-white font-semibold">
            Organization
          </TabsTrigger>
          <TabsTrigger value="departments" className="data-[state=active]:bg-primary/20 data-[state=active]:text-white font-semibold">
            Departments & Roles
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-primary/20 data-[state=active]:text-white font-semibold">
            Billing
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: ORGANIZATION ================= */}
        <TabsContent value="organization" className="space-y-6">
          <OrgSettingsForm orgId={user.organization?.id || ''} />
        </TabsContent>

        {/* ================= TAB 2: DEPARTMENTS & ROLES ================= */}
        <TabsContent value="departments">
          <DepartmentsManager />
        </TabsContent>

        {/* ================= TAB 3: BILLING ================= */}
        <TabsContent value="billing">
          <EmptyState
            icon={CreditCard}
            title="Billing coming soon"
            description="Usage-based billing configurations and subscription histories will be available here."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
