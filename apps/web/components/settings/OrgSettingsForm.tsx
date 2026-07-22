'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ChevronRight, AlertTriangle } from 'lucide-react';
import { notify } from '@/lib/toast';
import { formatDate } from '@/lib/utils/date';

import { useOrgProfile, useUpdateOrg } from '@/hooks/manager/useOrgProfile';
import { LogoUpload } from './LogoUpload';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export const TIMEZONES = [
  { value: 'Asia/Dubai',        label: 'UAE / Dubai (GMT+4)' },
  { value: 'Asia/Riyadh',       label: 'Saudi Arabia / Riyadh (GMT+3)' },
  { value: 'Africa/Cairo',      label: 'Egypt / Cairo (GMT+2)' },
  { value: 'Asia/Kuwait',       label: 'Kuwait (GMT+3)' },
  { value: 'Asia/Bahrain',      label: 'Bahrain (GMT+3)' },
  { value: 'Europe/London',     label: 'UK / London (GMT+0/+1)' },
  { value: 'Europe/Paris',      label: 'Europe / Paris (GMT+1/+2)' },
  { value: 'America/New_York',  label: 'US East / New York (GMT-5/-4)' },
  { value: 'America/Los_Angeles', label: 'US West / Los Angeles (GMT-8/-7)' },
  { value: 'Asia/Tokyo',        label: 'Japan / Tokyo (GMT+9)' },
  { value: 'UTC',               label: 'UTC (GMT+0)' },
];

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Retail', 
  'Education', 'Manufacturing', 'Consulting', 'Media', 'Other'
];

const orgSettingsSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(100, 'Company name must be at most 100 characters'),
  logoUrl: z.string().url('Logo URL must be a valid URL').optional().or(z.literal('')),
  industry: z.string().min(1, 'Please select an industry'),
  timezone: z.string().min(1, 'Please select a timezone'),
  defaultLanguage: z.enum(['EN', 'AR']),
});

type OrgSettingsFormValues = z.infer<typeof orgSettingsSchema>;

interface OrgSettingsFormProps {
  orgId: string;
}

export function OrgSettingsForm({ orgId }: OrgSettingsFormProps) {
  const { data: org, isLoading, error } = useOrgProfile(orgId);
  const updateOrgMutation = useUpdateOrg(orgId);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OrgSettingsFormValues>({
    resolver: zodResolver(orgSettingsSchema),
    defaultValues: {
      name: '',
      logoUrl: '',
      industry: 'Technology',
      timezone: 'Asia/Dubai',
      defaultLanguage: 'EN',
    },
  });

  const langWatch = watch('defaultLanguage');
  const timezoneWatch = watch('timezone');
  const industryWatch = watch('industry');

  // Reset form when organization details fetch completes
  useEffect(() => {
    if (org) {
      reset({
        name: org.name || '',
        logoUrl: org.logoUrl || '',
        industry: org.industry || 'Technology',
        timezone: org.timezone || 'Asia/Dubai',
        defaultLanguage: org.defaultLanguage || 'EN',
      });
    }
  }, [org, reset]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 border border-slate-800 bg-slate-900/10 rounded-xl">
        <Loader2 className="h-6 w-6 animate-spin text-primary shrink-0" />
        <span className="ml-3 text-sm text-slate-400 font-semibold">Loading organization settings...</span>
      </div>
    );
  }

  if (error || !org) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-semibold text-destructive">Failed to fetch organization profile details.</p>
      </Card>
    );
  }

  const onSubmit = async (values: OrgSettingsFormValues) => {
    try {
      await updateOrgMutation.mutateAsync({
        name: values.name,
        logoUrl: values.logoUrl || undefined,
        industry: values.industry,
        timezone: values.timezone,
        defaultLanguage: values.defaultLanguage,
      });
      reset(values); // reset form dirty state with new values
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConfirm = () => {
    setIsDeleteDialogOpen(false);
    setDeleteConfirmName('');
    notify.warning('Please contact support to complete deletion');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-950 border border-slate-900 shadow-glow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* SECTION A — Company Profile */}
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Company Profile</h3>
                <p className="text-xs text-muted-foreground mt-1">Configure company identifiers, logos, and market sectors.</p>
              </div>

              {/* LOGO UPLOAD AREA */}
              <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40">
                <LogoUpload
                  currentLogoUrl={watch('logoUrl') || null}
                  onUploadComplete={(url) => {
                    setValue('logoUrl', url, { shouldDirty: true, shouldValidate: true });
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name" className="text-xs text-slate-300 font-semibold">Company Name</Label>
                  <Input
                    id="name"
                    className="text-xs bg-slate-950 border-slate-900 text-white"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-[10px] text-destructive font-bold">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2 col-span-1">
                  <Label htmlFor="industry" className="text-xs text-slate-300 font-semibold">Industry</Label>
                  <Select
                    value={industryWatch || 'Other'}
                    onValueChange={(val) => setValue('industry', val || 'Other', { shouldDirty: true })}
                  >
                    <SelectTrigger className="text-xs bg-slate-950 border-slate-900 text-white h-9">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-900">
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind} className="text-xs hover:bg-slate-900 focus:bg-slate-900 text-white">
                          {ind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.industry && (
                    <p className="text-[10px] text-destructive font-bold">{errors.industry.message}</p>
                  )}
                </div>

                <div className="space-y-2 col-span-1">
                  <Label className="text-xs text-slate-300 font-semibold">Platform Workspace URL</Label>
                  <Input
                    value={`${org.slug}.ezlearn.ai`}
                    readOnly
                    disabled
                    className="text-xs bg-slate-950 border-slate-900 text-muted-foreground cursor-not-allowed select-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION B — Preferences */}
            <div className="space-y-6 pt-6 border-t border-slate-900">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Preferences</h3>
                <p className="text-xs text-muted-foreground mt-1">Manage global system languages and localization metrics.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 col-span-1">
                  <Label className="text-xs text-slate-300 font-semibold block">Default Language</Label>
                  <div className="flex items-center gap-3 bg-slate-950 border border-slate-900 rounded-lg p-3 w-fit select-none">
                    <span className={`text-xs font-bold transition-colors ${langWatch === 'EN' ? 'text-white' : 'text-muted-foreground'}`}>EN</span>
                    <Switch
                      checked={langWatch === 'AR'}
                      onCheckedChange={(checked) => setValue('defaultLanguage', checked ? 'AR' : 'EN', { shouldDirty: true })}
                    />
                    <span className={`text-xs font-bold transition-colors ${langWatch === 'AR' ? 'text-white' : 'text-muted-foreground'}`}>AR</span>
                  </div>
                </div>

                <div className="space-y-2 col-span-1">
                  <Label htmlFor="timezone" className="text-xs text-slate-300 font-semibold">System Timezone</Label>
                  <Select
                    value={timezoneWatch || 'Asia/Dubai'}
                    onValueChange={(val) => setValue('timezone', val || 'Asia/Dubai', { shouldDirty: true })}
                  >
                    <SelectTrigger className="text-xs bg-slate-950 border-slate-900 text-white h-9">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-900">
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value} className="text-xs hover:bg-slate-900 focus:bg-slate-900 text-white">
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.timezone && (
                    <p className="text-[10px] text-destructive font-bold">{errors.timezone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* SAVE BUTTON ROW */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-slate-900">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground select-none">
                  Last updated: {formatDate(org.updatedAt)}
                </p>
                {!isDirty && (
                  <p className="text-[10px] text-slate-500 font-medium select-none">No changes to save</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={!isDirty || isSubmitting}
                className="bg-gradient-primary border-0 text-white text-xs font-bold px-5 h-9"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                    Saving Changes...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* DANGER ZONE SECTION */}
      <details className="mt-8 group">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-white flex items-center gap-2 select-none">
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90 shrink-0" /> 
          <span>Danger Zone</span>
        </summary>
        <Card className="mt-3 border-destructive/20 bg-destructive/5 p-4 shadow-glow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-bold text-sm text-white">Delete Organization</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your workspace and all employee data. This action is irreversible.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-xs font-bold"
            >
              Delete Organization
            </Button>
          </div>
        </Card>
      </details>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-slate-950 border border-slate-900 text-white max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-center text-white">Permanently Delete Workspace</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 text-center mt-2 leading-relaxed">
              This action cannot be undone. To confirm, please type the organization name <span className="font-bold text-white select-all bg-slate-900 px-1 rounded">{org.name}</span> below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Enter organization name"
              className="text-xs bg-slate-950 border-slate-900 text-white"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 select-none">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteConfirmName('');
              }}
              className="bg-slate-950 border-slate-900 hover:bg-slate-900 text-white text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteConfirmName !== org.name}
              onClick={handleDeleteConfirm}
              className="text-xs font-bold"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
