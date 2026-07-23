'use client';

import React from 'react';
import Link from 'next/link';
import { CreditCard, ArrowRight } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DepartmentsManager } from '@/components/settings/DepartmentsManager';
import { OrgSettingsForm } from '@/components/settings/OrgSettingsForm';
import { AlertSettingsForm } from '@/components/settings/AlertSettingsForm';

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
  const isOrgAdmin = ['ORG_ADMIN', 'PLATFORM_ADMIN'].includes(user?.role ?? '');

  return (
    <div className="space-y-8 pb-12">
      <Tabs defaultValue="organization" className="w-full">
        <TabsList className={`grid w-full ${isOrgAdmin ? 'grid-cols-4 max-w-[650px]' : 'grid-cols-3 max-w-[500px]'} mb-8 bg-slate-900 border border-slate-800 p-1`}>
          <TabsTrigger
            value="organization"
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-white font-semibold"
          >
            Organization
          </TabsTrigger>
          <TabsTrigger
            value="departments"
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-white font-semibold"
          >
            Departments & Roles
          </TabsTrigger>
          {isOrgAdmin && (
            <TabsTrigger
              value="billing"
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-white font-semibold"
            >
              Billing
            </TabsTrigger>
          )}
          <TabsTrigger
            value="alerts"
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-white font-semibold"
          >
            Alerts
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
        {isOrgAdmin && (
          <TabsContent value="billing" className="space-y-6">
            <div className="flex flex-col items-center justify-center gap-6 py-16 text-center border border-slate-800 rounded-xl bg-slate-950/40">
              <div className="rounded-full bg-primary/10 p-4">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-white">
                  Billing & Usage
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                  View your AI token usage, manage your subscription,
                  and download invoices.
                </p>
              </div>
              <Link href="/manage/billing">
                <Button size="lg" className="bg-gradient-primary text-white font-bold text-sm px-6">
                  Go to Billing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </TabsContent>
        )}

        {/* ================= TAB 4: ALERTS ================= */}
        <TabsContent value="alerts">
          <AlertSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
