'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';
import { CreditCard, Calendar, Globe, MapPin, Briefcase, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils/date';
import { DepartmentsManager } from '@/components/settings/DepartmentsManager';

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

interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  timezone: string;
  planTier: string;
  defaultLanguage: string;
  createdAt: string;
}

function LabeledField({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex gap-3 p-3.5 rounded-lg bg-slate-950/20 border border-slate-900">
      <div className="text-primary shrink-0 mt-0.5">
        <Icon className="h-4 w-4" />
      </div>
      <div className="space-y-0.5">
        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider leading-none">{label}</span>
        <p className="text-sm font-bold text-white leading-normal">{value}</p>
      </div>
    </div>
  );
}

export function SettingsView({ user }: SettingsViewProps) {
  const { getToken } = useAuth();

  // Fetch full organization details to get industry, timezone, default language and creation timestamp
  const { data: orgRes, isLoading: isOrgLoading } = useQuery({
    queryKey: ['organization', user.organization?.id],
    queryFn: async () => {
      const client = createApiClient(getToken);
      return client.get<{ success: boolean; data: OrganizationDetails }>(`/orgs/${user.organization?.id}`);
    },
    enabled: !!user.organization?.id,
  });

  const org = orgRes?.data;
  const orgName = org?.name || user.organization?.name || 'Your Workspace';
  const orgSlug = org?.slug || user.organization?.slug || 'workspace';
  const planTier = org?.planTier || user.organization?.planTier || 'STARTER';

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
          {isOrgLoading ? (
            <div className="flex items-center justify-center p-12 border border-slate-800 bg-slate-900/10 rounded-xl">
              <Loader2 className="h-6 w-6 animate-spin text-primary shrink-0" />
              <span className="ml-3 text-sm text-slate-400 font-semibold">Loading organization settings...</span>
            </div>
          ) : (
            <Card className="bg-card border-border p-6 max-w-2xl">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-900/60">
                <div className="h-16 w-16 rounded-xl bg-gradient-primary flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-glow-sm select-none">
                  {orgName[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold text-white tracking-tight">{orgName}</h3>
                  <p className="text-muted-foreground text-xs">{orgSlug}.ezlearn.ai</p>
                  <Badge variant="secondary" className="bg-slate-950 border-slate-850 text-[10px] text-primary uppercase font-bold tracking-wider px-2 py-0.5 mt-1.5 select-none">
                    {planTier} Plan
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabeledField 
                  label="Industry" 
                  value={org?.industry || 'Not set'} 
                  icon={Briefcase} 
                />
                <LabeledField 
                  label="Timezone" 
                  value={org?.timezone || 'Asia/Dubai'} 
                  icon={MapPin} 
                />
                <LabeledField 
                  label="Default Language" 
                  value={org?.defaultLanguage || 'EN'} 
                  icon={Globe} 
                />
                <LabeledField 
                  label="Member Since" 
                  value={org?.createdAt ? formatDate(org.createdAt) : 'Not available'} 
                  icon={Calendar} 
                />
              </div>

              <Button variant="outline" className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 font-bold text-xs mt-6 select-none">
                Edit Organization →
              </Button>
            </Card>
          )}
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
