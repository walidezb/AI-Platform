'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import {
  ArrowLeft,
  Users,
  Map,
  DollarSign,
  Zap,
  Save,
  AlertTriangle,
  Eye,
  Receipt,
  CreditCard,
  Check,
  Clock,
  Download,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { createApiClient } from '@/lib/api-client';
import { useAdminOrgDetail } from '@/hooks/admin/useAdminOrgDetail';
import { OrgStatusBadge } from '@/components/admin/OrgStatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface InvoiceSummary {
  id: string;
  number: string | null;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  pdfUrl: string | null;
  hostedUrl: string | null;
  createdAt: Date | string;
}

function formatDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminOrgDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const orgId = (params?.orgId as string) || '';

  const { data: org, isLoading, refetch } = useAdminOrgDetail(orgId);

  const [budgetInput, setBudgetInput] = useState<number>(1_000_000);
  const [planTierInput, setPlanTierInput] = useState<string>('starter');

  useEffect(() => {
    if (org) {
      setBudgetInput(org.aiTokensBudget || 1_000_000);
      setPlanTierInput(org.planTier || 'starter');
    }
  }, [org]);

  const updateOrg = useMutation({
    mutationFn: async (payload: {
      planTier?: string;
      aiTokensBudget?: number;
    }) => {
      const client = createApiClient(getToken);
      return client.patch(`/admin/orgs/${orgId}`, payload);
    },
    onSuccess: () => {
      refetch();
      toast.success('✅ Organization updated successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update organization');
    },
  });

  const impersonate = useMutation({
    mutationFn: async (targetOrgId: string) => {
      const client = createApiClient(getToken);
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      return client.post<{ success: boolean; data: any }>(
        `/admin/orgs/${targetOrgId}/impersonate`,
      );
    },
    onSuccess: (res) => {
      const impersonateUrl = res.data?.impersonateUrl;
      if (impersonateUrl) {
        window.open(impersonateUrl, '_blank');
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Impersonation failed');
    },
  });

  /* Invoice data for GAP 3 */
  const { data: invoices, isLoading: loadInv } = useQuery({
    queryKey: ['admin-org-invoices', orgId],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: InvoiceSummary[] }>(
        `/admin/orgs/${orgId}/invoices`,
      );
      return res.data;
    },
    enabled: !!orgId && !!org?.stripeCustomerId,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <p>Organization not found</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push('/admin/organizations')}
        >
          ← Back to Organizations
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/organizations')}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Organizations
        </Button>
      </div>

      {/* ── SECTION 1: Org Header ── */}
      <Card className="p-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 rounded-xl border border-border">
            <AvatarImage src={org.logoUrl ?? undefined} />
            <AvatarFallback className="text-lg font-bold rounded-xl bg-primary/10 text-primary">
              {org.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-heading">{org.name}</h1>
              <OrgStatusBadge status={org.status} />
              <span
                className={cn(
                  'px-2 py-0.5 rounded-md text-xs font-semibold',
                  org.planTier === 'enterprise'
                    ? 'bg-violet-500/15 text-violet-400'
                    : org.planTier === 'growth'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-secondary text-muted-foreground',
                )}
              >
                {(org.planTier || 'starter').toUpperCase()} Plan
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Admin email: <strong className="text-foreground">{org.email || 'N/A'}</strong> · Slug:{' '}
              <span className="font-mono">{org.slug}</span> · Joined:{' '}
              {formatDate(org.createdAt)}
            </p>
            {org.status === 'SUSPENDED' && org.suspendedReason && (
              <p className="text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Suspended on {formatDate(org.suspendedAt)}: {org.suspendedReason}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-medium"
            disabled={impersonate.isPending}
            onClick={() => impersonate.mutate(org.id)}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            {impersonate.isPending ? 'Preparing...' : 'Impersonate'}
          </Button>
        </div>
      </Card>

      {/* ── SECTION 2: Stats Row (4 cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Users className="h-4.5 w-4.5" />
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {org.users?.length ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Total Employees</p>
        </Card>

        <Card className="p-4">
          <div className="h-8 w-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center mb-3">
            <Map className="h-4.5 w-4.5" />
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {org.learningPaths?.length ?? 0}
          </p>
          <p className="text-xs text-muted-foreground font-normal">
            Learning Paths
          </p>
        </Card>

        <Card className="p-4">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
            <Zap className="h-4.5 w-4.5" />
          </div>
          <p className="text-2xl font-bold text-amber-400 tabular-nums">
            ${org.monthlyUsage?.costUsd?.toFixed(2) ?? '0.00'}
          </p>
          <p className="text-xs text-muted-foreground">AI Cost (MTD)</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            {((org.monthlyUsage?.tokensUsed ?? 0) / 1000).toFixed(0)}K tokens
          </p>
        </Card>

        <Card className="p-4">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <DollarSign className="h-4.5 w-4.5" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">
            ${org.allTimeUsage?.costUsd?.toFixed(2) ?? '0.00'}
          </p>
          <p className="text-xs text-muted-foreground">All-Time AI Cost</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            {((org.allTimeUsage?.tokensUsed ?? 0) / 1000).toFixed(0)}K tokens
          </p>
        </Card>
      </div>

      {/* ── SECTION 3: Budget & Plan Adjustment Form ── */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Manage Plan & AI Budget
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              AI Token Budget (per period)
            </Label>
            <Input
              type="number"
              min={10000}
              step={50000}
              value={budgetInput}
              onChange={(e) => setBudgetInput(Number(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Current: {(org.aiTokensBudget || 1_000_000).toLocaleString()} tokens
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Plan Tier
            </Label>
            <Select
              value={planTierInput}
              onValueChange={(val) => setPlanTierInput(val || 'starter')}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button
              className="w-full"
              disabled={updateOrg.isPending}
              onClick={() =>
                updateOrg.mutate({
                  aiTokensBudget: budgetInput,
                  planTier: planTierInput,
                })
              }
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      {/* ── SECTION 4: Employees Table (read-only) ── */}
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Employees ({org.users?.length ?? 0})
        </h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Role</TableHead>
                <TableHead className="text-muted-foreground">
                  Department
                </TableHead>
                <TableHead className="text-muted-foreground">Progress</TableHead>
                <TableHead className="text-muted-foreground">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(org.users ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-6 text-xs text-muted-foreground"
                  >
                    No employees in this organization
                  </TableCell>
                </TableRow>
              ) : (
                (org.users ?? []).map((u) => {
                  const prog = u.userProgress?.[0];
                  return (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-medium text-sm">
                        {u.fullName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-semibold">
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.department || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {prog ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${prog.overallCompletionPct}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs tabular-nums">
                              {prog.overallCompletionPct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Not started
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(u.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── SECTION 5: Learning Paths Table (last 10) ── */}
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Map className="h-4 w-4 text-violet-400" />
          Learning Paths (Last 10)
        </h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Title</TableHead>
                <TableHead className="text-muted-foreground">Domain</TableHead>
                <TableHead className="text-muted-foreground text-center">
                  Milestones
                </TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(org.learningPaths ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-xs text-muted-foreground"
                  >
                    No learning paths created yet
                  </TableCell>
                </TableRow>
              ) : (
                (org.learningPaths ?? []).map((p) => (
                  <TableRow key={p.id} className="border-border">
                    <TableCell className="font-medium text-sm">
                      {p.title}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.domain}
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">
                      {p._count?.milestones ?? 0}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(p.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── SECTION 6: Billing History ── */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          Billing History
        </p>

        {!org?.stripeCustomerId ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CreditCard className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No Stripe billing account linked
            </p>
            <p className="text-xs text-muted-foreground">
              This organization hasn&apos;t completed billing setup yet.
            </p>
          </div>
        ) : loadInv ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : (invoices ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No invoices yet</p>
            <p className="text-xs text-muted-foreground">
              First invoice appears after trial period ends.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Invoice #</TableHead>
                  <TableHead className="text-muted-foreground">Period</TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Links
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoices ?? []).map((inv: InvoiceSummary) => (
                  <TableRow
                    key={inv.id}
                    className="border-border hover:bg-secondary/20"
                  >
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {inv.number ?? inv.id.slice(-8)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(inv.periodStart)} &rarr;{' '}
                      {formatDate(inv.periodEnd)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {inv.currency} ${inv.amountDue.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5',
                          'rounded-md text-xs font-medium border',
                          inv.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : inv.status === 'open'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : inv.status === 'void'
                            ? 'bg-secondary text-muted-foreground border-border'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                        )}
                      >
                        {inv.status === 'paid' && <Check className="h-3 w-3" />}
                        {inv.status === 'open' && <Clock className="h-3 w-3" />}
                        {inv.status === 'uncollectible' && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {inv.hostedUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              window.open(inv.hostedUrl!, '_blank')
                            }
                          >
                            View
                          </Button>
                        )}
                        {inv.pdfUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => window.open(inv.pdfUrl!, '_blank')}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
