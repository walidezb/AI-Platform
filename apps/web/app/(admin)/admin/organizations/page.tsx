'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { createApiClient } from '@/lib/api-client';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/ui/PageHeader';
import { OrgStatusBadge } from '@/components/admin/OrgStatusBadge';
import { Input } from '@/components/ui/input';
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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export interface OrgRow {
  id: string;
  name: string;
  email: string | null;
  logoUrl: string | null;
  planTier: string;
  status: string;
  subscriptionStatus: string;
  aiTokensBudget: number;
  suspendedAt: string | Date | null;
  suspendedReason: string | null;
  createdAt: string | Date;
  totalEmployees: number;
  totalPaths: number;
  aiCostThisMonth: number;
  tokensThisMonth: number;
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

export default function AdminOrgsPage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [search, setSearch] = useState('');
  const [planFilter, setPlan] = useState('');
  const [statusFilter, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [suspendTarget, setSuspend] = useState<OrgRow | null>(null);
  const [suspendReason, setReason] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-orgs', debouncedSearch, planFilter, statusFilter, page],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const p = new URLSearchParams();
      if (debouncedSearch) p.set('search', debouncedSearch);
      if (planFilter) p.set('planTier', planFilter);
      if (statusFilter) p.set('status', statusFilter);
      p.set('page', String(page));

      const res = await client.get<{
        success: boolean;
        data: { orgs: OrgRow[]; total: number };
      }>(`/admin/orgs?${p.toString()}`);
      return res.data;
    },
    staleTime: 30_000,
  });

  const suspend = useMutation({
    mutationFn: async ({ orgId, reason }: { orgId: string; reason: string }) => {
      const client = createApiClient(getToken);
      return client.post(`/admin/orgs/${orgId}/suspend`, { reason });
    },
    onSuccess: () => {
      refetch();
      setSuspend(null);
      setReason('');
      toast.success('🚫 Organization suspended');
    },
  });

  const reactivate = useMutation({
    mutationFn: async (orgId: string) => {
      const client = createApiClient(getToken);
      return client.post(`/admin/orgs/${orgId}/reactivate`);
    },
    onSuccess: () => {
      refetch();
      toast.success('✅ Organization reactivated');
    },
  });

  const orgs = data?.orgs ?? [];
  const totalOrgs = data?.total ?? 0;
  const totalPages = Math.ceil(totalOrgs / 20);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Organizations"
        subtitle={`${totalOrgs} total organizations`}
      />

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9"
          />
        </div>

        <Select
          value={planFilter}
          onValueChange={(v) => {
            setPlan(v || '');
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="All Plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="growth">Growth</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatus(v || '');
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="TRIAL">Trial</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="CANCELED">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Orgs table ── */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6">
          <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-muted-foreground">Organization</TableHead>
              <TableHead className="text-muted-foreground">Plan</TableHead>
              <TableHead className="text-muted-foreground text-center">
                Employees
              </TableHead>
              <TableHead className="text-muted-foreground text-right">
                AI Cost (MTD)
              </TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Joined</TableHead>
              <TableHead className="text-muted-foreground text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full rounded" />
                    </TableCell>
                  </TableRow>
                ))
            ) : orgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No organizations found
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orgs.map((org) => (
                <TableRow
                  key={org.id}
                  className="border-border hover:bg-secondary/20 cursor-pointer"
                  onClick={() => router.push(`/admin/organizations/${org.id}`)}
                >
                  {/* Org name + logo */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={org.logoUrl ?? undefined} />
                        <AvatarFallback className="text-xs rounded-lg bg-primary/10 text-primary">
                          {org.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.email || 'No admin email'}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Plan */}
                  <TableCell>
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
                      {org.planTier.charAt(0).toUpperCase() +
                        org.planTier.slice(1)}
                    </span>
                  </TableCell>

                  {/* Employees */}
                  <TableCell className="text-center text-sm tabular-nums">
                    {org.totalEmployees}
                  </TableCell>

                  {/* AI Cost */}
                  <TableCell className="text-right text-sm tabular-nums font-medium text-amber-400">
                    ${org.aiCostThisMonth.toFixed(2)}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <OrgStatusBadge status={org.status} />
                  </TableCell>

                  {/* Joined */}
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(org.createdAt)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div
                      className="flex items-center gap-1 justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          router.push(`/admin/organizations/${org.id}`)
                        }
                      >
                        View →
                      </Button>
                      {org.status === 'SUSPENDED' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300"
                          disabled={reactivate.isPending}
                          onClick={() => reactivate.mutate(org.id)}
                        >
                          Reactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300"
                          onClick={() => setSuspend(org)}
                        >
                          Suspend
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, totalOrgs)} of{' '}
            {totalOrgs}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Suspend confirm dialog ── */}
      <AlertDialog
        open={!!suspendTarget}
        onOpenChange={() => {
          setSuspend(null);
          setReason('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Suspend &quot;{suspendTarget?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All users in this organization will receive a 403 error. AI
              operations and logins will be blocked immediately. You can
              reactivate at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Reason (required — shown in logs)
            </Label>
            <Textarea
              placeholder="e.g. Non-payment, terms violation..."
              value={suspendReason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!suspendReason.trim() || suspend.isPending}
              className="bg-rose-500 hover:bg-rose-600 text-white"
              onClick={() => {
                if (!suspendTarget) return;
                suspend.mutate({
                  orgId: suspendTarget.id,
                  reason: suspendReason,
                });
              }}
            >
              Suspend Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
