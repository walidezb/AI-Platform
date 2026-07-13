'use client';

import React, { useState, useRef } from 'react';
import { useInvitations, Invitation } from '@/hooks/manager/useInvitations';
import { useDepartments } from '@/hooks/manager/useDepartments';
import { copyToClipboard } from '@/lib/clipboard';
import { timeAgo } from '@/lib/utils/date';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';
import { toast } from 'sonner';

import { 
  Mail, 
  Send, 
  Trash2, 
  Link2, 
  Download, 
  Upload, 
  Search, 
  Loader2 
} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge, StatusType } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ParsedEmployee {
  id: string;
  fullName: string;
  email: string;
  jobTitle?: string;
  departmentName?: string;
  departmentId?: string;
}

export default function InvitationsPage() {
  const { 
    invitations, 
    isLoading: isInvitationsLoading, 
    invite, 
    isInviting, 
    bulkInvite, 
    isBulkInviting, 
    resendInvite, 
    revokeInvite 
  } = useInvitations();

  // Tab State
  const [activeTab, setActiveTab] = useState<string>('send-invites');

  // Single Invite Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);

  // Bulk CSV States
  const [csvEmployees, setCsvEmployees] = useState<ParsedEmployee[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search/Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // Revoke Dialog Target
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);

  // Copy Tooltip Tracker
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch departments and roles using the custom hook
  const { departments, roles } = useDepartments();

  // Filtered roles based on selected departmentId
  const filteredRoles = departmentId 
    ? roles.filter(r => r.departmentId === departmentId)
    : [];

  // --- Calculations ---
  const activeInvitations = invitations.map(inv => {
    const isExpired = inv.onboardingTokenExpiry ? new Date(inv.onboardingTokenExpiry) < new Date() : false;
    return {
      ...inv,
      computedStatus: (inv.invitationStatus === 'ACCEPTED' 
        ? 'accepted' 
        : inv.invitationStatus === 'REVOKED' 
          ? 'revoked' 
          : isExpired 
            ? 'expired' 
            : inv.invitationStatus === 'IN_PROGRESS' 
              ? 'in-progress' 
              : 'pending') as StatusType
    };
  });

  const pendingCount = activeInvitations.filter(i => i.computedStatus === 'pending' || i.computedStatus === 'in-progress').length;
  const acceptedCount = activeInvitations.filter(i => i.computedStatus === 'accepted').length;
  const revokedCount = activeInvitations.filter(i => i.computedStatus === 'revoked').length;

  const filteredInvitations = activeInvitations.filter(inv => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    return inv.fullName.toLowerCase().includes(search) || inv.email.toLowerCase().includes(search);
  });

  // --- Handlers ---
  const handleSingleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      toast.error('Please enter full name and email address');
      return;
    }
    try {
      await invite({
        fullName,
        email,
        jobTitle: jobTitle || undefined,
        departmentId: departmentId || undefined
      });
      toast.success(`Invitation sent successfully to ${fullName}!`);
      // Reset form
      setFullName('');
      setEmail('');
      setJobTitle('');
      setDepartmentId(undefined);
      // Switch tab
      setActiveTab('manage-invitations');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send invitation';
      toast.error(errorMsg);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Full Name,Email,Job Title,Department\n"
      + "John Doe,john@example.com,Software Engineer,Engineering\n"
      + "Jane Smith,jane@example.com,Product Manager,Product\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ezlearn_invite_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileParse(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileParse(file);
  };

  const handleFileParse = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a valid CSV file');
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = (results.data as Record<string, string>[]).map((row, index) => {
          const rawName = row['Full Name'] || row['fullName'] || row['Name'] || '';
          const rawEmail = row['Email'] || row['email'] || '';
          const rawJob = row['Job Title'] || row['jobTitle'] || '';
          const rawDept = row['Department'] || row['department'] || '';
          
          const dept = departments.find(d => d.name.toLowerCase() === rawDept.trim().toLowerCase());
          
          return {
            id: String(index),
            fullName: rawName.trim(),
            email: rawEmail.trim(),
            jobTitle: rawJob.trim() || undefined,
            departmentName: rawDept.trim() || undefined,
            departmentId: dept?.id || undefined,
          };
        }).filter(emp => emp.fullName && emp.email);

        if (parsed.length === 0) {
          toast.error('No valid rows found in CSV. Expected columns: Full Name, Email');
          return;
        }

        setCsvEmployees(parsed);
        toast.success(`Successfully parsed ${parsed.length} employees from CSV`);
      },
      error: () => {
        toast.error('Failed to parse CSV file');
      }
    });
  };

  const handleBulkInviteSubmit = async () => {
    if (csvEmployees.length === 0) return;
    try {
      const payload = csvEmployees.map(emp => ({
        fullName: emp.fullName,
        email: emp.email,
        jobTitle: emp.jobTitle,
        departmentId: emp.departmentId,
      }));
      const res = await bulkInvite(payload);
      toast.success(`Invited ${res.data.succeeded} employees successfully!`);
      if (res.data.failed > 0) {
        toast.warning(`${res.data.failed} invitations failed (already joined/invalid)`);
      }
      setCsvEmployees([]);
      setActiveTab('manage-invitations');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to dispatch bulk invites';
      toast.error(errorMsg);
    }
  };

  const handleCopyLink = async (inv: Invitation) => {
    if (!inv.onboardingToken) return;
    const appUrl = window.location.origin;
    const link = `${appUrl}/onboarding/${inv.onboardingToken}`;
    const success = await copyToClipboard(link);
    if (success) {
      setCopiedId(inv.id);
      toast.success('Invitation link copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleResend = async (inv: Invitation) => {
    try {
      await resendInvite(inv.id);
      toast.success(`Re-sent invitation email successfully to ${inv.fullName}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to resend invitation';
      toast.error(errorMsg);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    try {
      await revokeInvite(revokeTarget.id);
      toast.success(`Invitation for ${revokeTarget.fullName} revoked successfully.`);
      setRevokeTarget(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke invitation';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Invitations"
        subtitle="Manage pending employee invites and track onboarding diagnostics"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8 bg-slate-900 border border-slate-800 p-1">
          <TabsTrigger value="send-invites" className="data-[state=active]:bg-primary/20 data-[state=active]:text-white font-semibold">
            Send Invites
          </TabsTrigger>
          <TabsTrigger value="manage-invitations" className="data-[state=active]:bg-primary/20 data-[state=active]:text-white font-semibold flex items-center justify-center">
            Manage Invitations
            {pendingCount > 0 && (
              <span className="ml-2 bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold select-none">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: SEND INVITES ================= */}
        <TabsContent value="send-invites" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Card A: Single Invite Form */}
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-white">Invite an Employee</CardTitle>
                <CardDescription className="text-muted-foreground text-xs">
                  Fill details below to send a customized onboarding email link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSingleInviteSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-300 font-semibold text-xs">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Alex Rivera"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300 font-semibold text-xs">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g. alex@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-800 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle" className="text-slate-300 font-semibold text-xs">Job Title</Label>
                      <Input
                        id="jobTitle"
                        list="role-suggestions"
                        placeholder="e.g. Developer"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white"
                      />
                      <datalist id="role-suggestions">
                        {filteredRoles.map(r => (
                          <option key={r.id} value={r.title} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-slate-300 font-semibold text-xs">Department</Label>
                      <Select 
                        value={departmentId || 'none'} 
                        onValueChange={(val) => {
                          setDepartmentId(val === 'none' || !val ? undefined : val);
                          setJobTitle('');
                        }}
                      >
                        <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-slate-300">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800 text-white">
                          <SelectItem value="none">None</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isInviting} 
                    className="w-full bg-gradient-primary border-0 text-white font-bold"
                  >
                    {isInviting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                        Sending Invite...
                      </>
                    ) : (
                      'Send Invitation'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Card B: Bulk Import Section */}
            <Card className="bg-card border border-border flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold text-white">Bulk Import via CSV</CardTitle>
                    <CardDescription className="text-muted-foreground text-xs">
                      Upload a spreadsheet template to onboarding many learners.
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadTemplate} 
                    className="bg-slate-950 border-slate-800 text-xs font-semibold"
                  >
                    <Download className="h-3.5 w-3.5 mr-1 shrink-0" />
                    CSV Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between space-y-6">
                
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex-1 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[160px]",
                    isDragging ? "border-primary bg-primary/5" : "border-slate-800 hover:border-slate-700 bg-slate-950/20"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-sm font-semibold text-white mb-1">
                    Drag and drop your CSV file here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse from files (.csv)
                  </p>
                </div>

                {/* CSV Employees Parsed List Preview */}
                {csvEmployees.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Preview Parsed Users ({csvEmployees.length})
                      </h4>
                      <Button 
                        variant="link" 
                        onClick={() => setCsvEmployees([])} 
                        className="text-xs text-destructive hover:no-underline font-semibold p-0 h-auto"
                      >
                        Clear List
                      </Button>
                    </div>
                    
                    <div className="max-h-[180px] overflow-y-auto border border-slate-800 rounded-lg divide-y divide-slate-800">
                      {csvEmployees.map((emp) => (
                        <div key={emp.id} className="flex justify-between items-center p-3 text-xs">
                          <div>
                            <p className="font-bold text-white">{emp.fullName}</p>
                            <p className="text-[10px] text-muted-foreground">{emp.email}</p>
                          </div>
                          <div className="text-right text-[10px] text-muted-foreground">
                            {emp.jobTitle && <p>{emp.jobTitle}</p>}
                            {emp.departmentName && <p>{emp.departmentName}</p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button 
                      onClick={handleBulkInviteSubmit} 
                      disabled={isBulkInviting} 
                      className="w-full bg-gradient-primary border-0 text-white font-bold"
                    >
                      {isBulkInviting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                          Sending bulk invites...
                        </>
                      ) : (
                        `Send ${csvEmployees.length} Invitations`
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* ================= TAB 2: MANAGE INVITATIONS ================= */}
        <TabsContent value="manage-invitations" className="space-y-6">
          
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Pending Invitees</p>
                <h3 className="font-heading text-3xl font-bold text-white mt-2">{pendingCount}</h3>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Accepted Invites</p>
                <h3 className="font-heading text-3xl font-bold text-white mt-2">{acceptedCount}</h3>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Revoked Invites</p>
                <h3 className="font-heading text-3xl font-bold text-white mt-2">{revokedCount}</h3>
              </CardContent>
            </Card>
          </div>

          {/* Search/Filter Container */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Filter invitations by employee name or email address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-950 border-slate-800 text-white w-full"
            />
          </div>

          {/* Invitations Table */}
          {isInvitationsLoading ? (
            <div className="flex items-center justify-center p-12 border border-slate-800 bg-slate-900/10 rounded-xl">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-3 text-sm text-slate-400">Loading invitations...</span>
            </div>
          ) : filteredInvitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No invitations found"
              description={searchTerm ? "Try searching for a different employee name" : "Start by inviting your first employee under the Send Invites tab"}
            />
          ) : (
            <TooltipProvider delay={150}>
              <div className="border border-border rounded-xl bg-card overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-950/40">
                    <TableRow className="hover:bg-transparent border-slate-800">
                      <TableHead className="text-xs font-semibold text-slate-300">Employee</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-300">Email</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-300">Department</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-300">Job Title</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-300">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-300">Invited</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-300 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvitations.map((inv) => (
                      <TableRow key={inv.id} className="hover:bg-slate-950/20 border-slate-800">
                        <TableCell className="font-bold text-white text-xs">{inv.fullName}</TableCell>
                        <TableCell className="text-slate-300 text-xs">{inv.email}</TableCell>
                        <TableCell className="text-slate-300 text-xs">
                          {inv.department?.name || <span className="text-slate-500">-</span>}
                        </TableCell>
                        <TableCell className="text-slate-300 text-xs">
                          {inv.jobTitle || <span className="text-slate-500">-</span>}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={inv.computedStatus} className="scale-90" />
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs select-none">
                          {timeAgo(inv.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5">
                            
                            {/* Copy Link Button */}
                            {inv.computedStatus !== 'accepted' && inv.computedStatus !== 'revoked' && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleCopyLink(inv)} 
                                    className="h-8 w-8 hover:bg-slate-900 text-slate-400 hover:text-white"
                                  >
                                    <Link2 className="h-4 w-4 shrink-0" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-950 border border-slate-800 text-[10px] text-white font-semibold">
                                  {copiedId === inv.id ? 'Copied!' : 'Copy Link'}
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Resend Button */}
                            <Tooltip>
                              <TooltipTrigger>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleResend(inv)}
                                  disabled={inv.computedStatus === 'accepted'}
                                  className="h-8 w-8 hover:bg-slate-900 text-slate-400 hover:text-white disabled:opacity-40"
                                >
                                  <Send className="h-4 w-4 shrink-0" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-950 border border-slate-800 text-[10px] text-white font-semibold">
                                Resend Invite
                              </TooltipContent>
                            </Tooltip>

                            {/* Revoke Trigger button with Alert Dialog */}
                            <AlertDialog>
                              <AlertDialogTrigger>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={inv.computedStatus === 'accepted' || inv.computedStatus === 'revoked'}
                                  onClick={() => setRevokeTarget(inv)}
                                  className="h-8 w-8 hover:bg-slate-900 text-destructive/80 hover:text-destructive disabled:opacity-40"
                                >
                                  <Trash2 className="h-4 w-4 shrink-0" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-950 border border-slate-800 text-white">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white font-bold">Revoke Invitation?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400 text-xs">
                                    This will invalidate the active onboarding link for{' '}
                                    <span className="font-semibold text-white">{revokeTarget?.fullName}</span>.{' '}
                                    They will not be able to join the platform using this token.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-white text-xs font-semibold">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={handleRevokeConfirm} 
                                    className="bg-destructive border-0 text-white font-bold hover:bg-destructive/90 text-xs"
                                  >
                                    Revoke Link
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TooltipProvider>
          )}

        </TabsContent>
      </Tabs>
    </div>
  );
}
