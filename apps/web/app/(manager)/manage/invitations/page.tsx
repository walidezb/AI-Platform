'use client';

import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Upload,
  UserPlus,
  Search,
  Send,
  Trash2,
  X,
  Check,
  Copy,
  RotateCw,
  Mail,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';
import { notify } from '@/lib/toast';
import { downloadCsvTemplate } from '@/lib/csv';
import { SingleInviteForm } from '@/components/invitations/SingleInviteForm';
import { BulkImportDialog } from '@/components/invitations/BulkImportDialog';
import { InviteStatusBadge } from '@/components/invitations/InviteStatusBadge';
import {
  useInvitations,
  useInviteStats,
  useRegenerateLink,
  useResendInvite,
  useRevokeInvite,
  useBulkResend,
  useBulkRevoke,
  InvitationRow,
} from '@/hooks/manager/useInvitations';

function formatDate(date: string | Date | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function InvitationsPage() {
  const queryClient = useQueryClient();
  const { data: stats } = useInviteStats();
  const { data: invitations, isLoading } = useInvitations();
  const resend = useResendInvite();
  const revoke = useRevokeInvite();
  const regenerate = useRegenerateLink();
  const bulkResend = useBulkResend();
  const bulkRevoke = useBulkRevoke();

  const [tab, setTab] = useState<'send' | 'manage'>('send');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revokeTarget, setRevokeTarget] = useState<InvitationRow | null>(null);
  const [bulkRevokeOpen, setBulkRevokeOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter invitations client-side
  const filtered = useMemo(() => {
    let rows = invitations ?? [];
    if (statusFilter) {
      rows = rows.filter((r) => r.inviteStatus === statusFilter);
    }
    if (searchQ) {
      const q = searchQ.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [invitations, statusFilter, searchQ]);

  const copyLink = async (row: InvitationRow) => {
    if (!row.onboardingLink) return;
    await navigator.clipboard.writeText(row.onboardingLink);
    setCopiedId(row.userId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const selectableIds = filtered
      .filter((r) => r.inviteStatus !== 'ACCEPTED')
      .map((r) => r.userId);
    if (selected.size === selectableIds.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableIds));
    }
  };

  const handleExportCsv = () => {
    window.open('/api/invitations/export', '_blank');
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-5">
        {/* ── Page header ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <PageHeader
            title="Invitations"
            subtitle="Manage employee onboarding invitations"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="border-slate-800 bg-slate-950 text-slate-100 hover:bg-slate-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* ── Tabs ── */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'send' | 'manage')}
        >
          <TabsList className="mb-5 border border-slate-800 bg-slate-900/80">
            <TabsTrigger
              value="send"
              id="tab-send-invites"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-semibold"
            >
              Send Invites
            </TabsTrigger>
            <TabsTrigger
              value="manage"
              id="tab-manage-invites"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-semibold flex items-center"
            >
              Manage Invitations
              {stats && stats.pending > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                  {stats.pending}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ════════════════════════════════════════
              TAB 1 — SEND INVITES
          ════════════════════════════════════════ */}
          <TabsContent value="send" className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Single invite form */}
              <Card className="p-5 border-slate-800 bg-slate-900/60">
                <p className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-100">
                  <UserPlus className="h-4 w-4 text-indigo-400" />
                  Invite an Employee
                </p>
                <SingleInviteForm
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['invitations'] });
                    queryClient.invalidateQueries({ queryKey: ['invite-stats'] });
                    setTab('manage');
                    notify.success('✅ Invitation sent!');
                  }}
                />
              </Card>

              {/* Bulk CSV import */}
              <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-4">
                <p className="text-sm font-semibold flex items-center gap-2 text-slate-100">
                  <Upload className="h-4 w-4 text-indigo-400" />
                  Bulk Invite via CSV
                </p>
                <div className="space-y-4">
                  {/* Template download */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        CSV Template
                      </p>
                      <p className="text-xs text-slate-400">
                        Download our template with the required columns
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={downloadCsvTemplate}
                      className="border-slate-800 text-slate-200 hover:bg-slate-800"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Template
                    </Button>
                  </div>

                  {/* Trigger BulkImportDialog */}
                  <Button
                    onClick={() => setBulkImportOpen(true)}
                    className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-semibold"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV File
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ════════════════════════════════════════
              TAB 2 — MANAGE INVITATIONS
          ════════════════════════════════════════ */}
          <TabsContent value="manage" className="space-y-5">
            {/* ── Stats row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total', value: stats?.total, statusKey: '' },
                { label: 'Pending', value: stats?.pending, statusKey: 'PENDING' },
                {
                  label: 'In Progress',
                  value: stats?.inProgress,
                  statusKey: 'IN_PROGRESS',
                },
                {
                  label: 'Accepted',
                  value: stats?.accepted,
                  statusKey: 'ACCEPTED',
                },
                { label: 'Expired', value: stats?.expired, statusKey: 'EXPIRED' },
                { label: 'Revoked', value: stats?.revoked, statusKey: 'REVOKED' },
              ].map((s) => (
                <button
                  type="button"
                  key={s.label}
                  onClick={() =>
                    setStatusFilter(
                      statusFilter === s.statusKey ? '' : s.statusKey,
                    )
                  }
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all',
                    statusFilter === s.statusKey
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700',
                  )}
                >
                  <p className="text-xl font-bold tabular-nums text-slate-100">
                    {s.value ?? '—'}
                  </p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </button>
              ))}
            </div>

            {/* ── Filters + bulk actions ── */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  className="pl-9 h-9 border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500"
                  id="invitation-search"
                />
              </div>

              {/* Bulk action bar */}
              <AnimatePresence>
                {selected.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10"
                  >
                    <span className="text-xs font-medium text-indigo-300">
                      {selected.size} selected
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/20"
                      disabled={bulkResend.isPending}
                      onClick={() => {
                        bulkResend.mutate(Array.from(selected));
                        setSelected(new Set());
                        notify.success(
                          `👋 Resending ${selected.size} invitations...`,
                        );
                      }}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Resend All
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/20"
                      onClick={() => setBulkRevokeOpen(true)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Revoke All
                    </Button>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Invitations table ── */}
            <Card className="overflow-hidden border-slate-800 bg-slate-900/60">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-800 bg-slate-900/80">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          selected.size > 0 &&
                          selected.size ===
                            filtered.filter((r) => r.inviteStatus !== 'ACCEPTED')
                              .length
                        }
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="text-slate-400">Employee</TableHead>
                    <TableHead className="text-slate-400">Department</TableHead>
                    <TableHead className="text-slate-400">Job Title</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Invited</TableHead>
                    <TableHead className="text-slate-400">Expires</TableHead>
                    <TableHead className="text-slate-400 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <TableRow key={i} className="border-slate-800">
                          <TableCell colSpan={8}>
                            <Skeleton className="h-8 w-full rounded bg-slate-800" />
                          </TableCell>
                        </TableRow>
                      ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="py-12 flex flex-col items-center gap-2">
                          <Mail className="h-8 w-8 text-slate-600" />
                          <p className="text-sm text-slate-400">
                            No invitations found
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTab('send')}
                            className="border-slate-800 text-slate-300 hover:bg-slate-800"
                          >
                            Send your first invite →
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row) => (
                      <TableRow
                        key={row.userId}
                        className="border-slate-800/60 hover:bg-slate-800/40"
                      >
                        {/* Checkbox */}
                        <TableCell>
                          {row.inviteStatus !== 'ACCEPTED' && (
                            <Checkbox
                              checked={selected.has(row.userId)}
                              onCheckedChange={() => toggleSelect(row.userId)}
                            />
                          )}
                        </TableCell>

                        {/* Employee */}
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              {row.fullName}
                            </p>
                            <p className="text-xs text-slate-400">{row.email}</p>
                          </div>
                        </TableCell>

                        {/* Department */}
                        <TableCell>
                          <span className="text-sm text-slate-400">
                            {row.department ?? '—'}
                          </span>
                        </TableCell>

                        {/* Job title */}
                        <TableCell>
                          <span className="text-sm text-slate-400">
                            {row.jobTitle ?? '—'}
                          </span>
                        </TableCell>

                        {/* Status badge */}
                        <TableCell>
                          <InviteStatusBadge status={row.inviteStatus} />
                        </TableCell>

                        {/* Invited date */}
                        <TableCell>
                          <span className="text-sm text-slate-400">
                            {row.invitedAt ? formatDate(row.invitedAt) : '—'}
                          </span>
                        </TableCell>

                        {/* Expires */}
                        <TableCell>
                          {row.inviteStatus === 'ACCEPTED' ? (
                            <span className="text-xs text-emerald-400">—</span>
                          ) : row.isExpired ? (
                            <span className="text-xs text-rose-400 font-medium">
                              Expired
                            </span>
                          ) : row.expiresAt ? (
                            <span
                              className={cn(
                                'text-xs',
                                new Date(row.expiresAt).getTime() - Date.now() <
                                  3 * 24 * 60 * 60 * 1000
                                  ? 'text-amber-400 font-medium'
                                  : 'text-slate-400',
                              )}
                            >
                              {formatDate(row.expiresAt)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {/* Copy link */}
                            {row.onboardingLink &&
                              row.inviteStatus !== 'REVOKED' && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-slate-400 hover:text-slate-200"
                                      onClick={() => copyLink(row)}
                                    >
                                      {copiedId === row.userId ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {copiedId === row.userId
                                      ? 'Copied!'
                                      : 'Copy link'}
                                  </TooltipContent>
                                </Tooltip>
                              )}

                            {/* Regenerate link (expired only) */}
                            {row.isExpired && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-amber-400 hover:text-amber-300"
                                    disabled={regenerate.isPending}
                                    onClick={async () => {
                                      const res =
                                        await regenerate.mutateAsync(row.userId);
                                      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                      const link = res.data?.link ?? (res as any)?.link;
                                      if (link) {
                                        await navigator.clipboard.writeText(link);
                                      }
                                      notify.success(
                                        '🔗 New link generated & copied!',
                                        'The invite email has been resent.',
                                      );
                                    }}
                                  >
                                    <RotateCw className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Generate new link
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Resend email */}
                            {['PENDING', 'IN_PROGRESS'].includes(
                              row.inviteStatus,
                            ) && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-200"
                                    disabled={resend.isPending}
                                    onClick={() => {
                                      resend.mutate(row.userId);
                                      notify.success(
                                        '📧 Invite resent',
                                        `Resent to ${row.email}`,
                                      );
                                    }}
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Resend email</TooltipContent>
                              </Tooltip>
                            )}

                            {/* Revoke */}
                            {!['ACCEPTED', 'REVOKED'].includes(
                              row.inviteStatus,
                            ) && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-rose-400/70 hover:text-rose-400"
                                    onClick={() => setRevokeTarget(row)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Revoke invite</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Bulk import modal ── */}
        <BulkImportDialog
          open={bulkImportOpen}
          onOpenChange={setBulkImportOpen}
          onSuccess={(count) => {
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            queryClient.invalidateQueries({ queryKey: ['invite-stats'] });
            setTab('manage');
            notify.success(
              `✅ ${count} invitations sent!`,
              'Employees will receive their invite emails shortly.',
            );
          }}
        />

        {/* ── Single revoke confirm dialog ── */}
        <AlertDialog
          open={!!revokeTarget}
          onOpenChange={() => setRevokeTarget(null)}
        >
          <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                This will invalidate{' '}
                <strong className="text-slate-200">
                  {revokeTarget?.fullName}
                </strong>
                &apos;s onboarding link. They will no longer be able to start their
                assessment. You can send a new invite at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-800 text-slate-300 hover:bg-slate-800">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                onClick={() => {
                  if (!revokeTarget) return;
                  revoke.mutate(revokeTarget.userId);
                  setRevokeTarget(null);
                  notify.success('🚫 Invitation revoked');
                }}
              >
                Revoke
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Bulk revoke confirm dialog ── */}
        <AlertDialog open={bulkRevokeOpen} onOpenChange={setBulkRevokeOpen}>
          <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Revoke {selected.size} invitation
                {selected.size > 1 ? 's' : ''}?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                All selected onboarding links will be invalidated immediately. This
                cannot be undone, but you can re-invite them later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-800 text-slate-300 hover:bg-slate-800">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                onClick={() => {
                  bulkRevoke.mutate(Array.from(selected));
                  setSelected(new Set());
                  setBulkRevokeOpen(false);
                  notify.success(`🚫 ${selected.size} invitations revoked`);
                }}
              >
                Revoke All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
