'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createApiClient } from '@/lib/api-client';
import { notify } from '@/lib/toast';

export type AlertSettingsData = {
  id?: string;
  organizationId?: string;
  stalledAfterDays: number;
  atRiskAfterDays: number;
  enableManagerAlerts: boolean;
  enableLearnerNudges: boolean;
  alertHour: number;
};

export function AlertSettingsForm() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['alert-settings'],
    queryFn: async () => {
      const client = createApiClient(getToken);
      const res = await client.get<{ success: boolean; data: AlertSettingsData }>(
        '/alerts/settings',
      );
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (dto: Partial<AlertSettingsData>) => {
      const client = createApiClient(getToken);
      const res = await client.patch<{ success: boolean; data: AlertSettingsData }>(
        '/alerts/settings',
        dto,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-settings'] });
      notify.success('✅ Alert settings saved');
    },
    onError: () => {
      notify.error('Failed to save alert settings');
    },
  });

  const { handleSubmit, watch, reset, setValue } = useForm<AlertSettingsData>({
    defaultValues: settings ?? {
      stalledAfterDays: 7,
      atRiskAfterDays: 14,
      enableManagerAlerts: true,
      enableLearnerNudges: true,
      alertHour: 9,
    },
  });

  useEffect(() => {
    if (settings) reset(settings);
  }, [settings, reset]);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl bg-slate-800" />;

  const enableManagerAlerts = watch('enableManagerAlerts') ?? true;
  const enableLearnerNudges = watch('enableLearnerNudges') ?? true;
  const stalledAfterDays = watch('stalledAfterDays') ?? 7;
  const atRiskAfterDays = watch('atRiskAfterDays') ?? 14;

  return (
    <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))}>
      <Card className="p-6 space-y-6 border-slate-800 bg-slate-900/60">
        {/* Toggle: Manager alerts */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-100">
              Manager Alert Emails
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Send daily digest to managers when learners are stalled
            </p>
          </div>
          <Switch
            checked={enableManagerAlerts}
            onCheckedChange={(v) => {
              setValue('enableManagerAlerts', v);
              updateMutation.mutate({ enableManagerAlerts: v });
            }}
          />
        </div>

        <Separator className="bg-slate-800" />

        {/* Toggle: Learner nudges */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-100">
              Automatic Learner Nudges
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Send motivational emails to stalled employees automatically
            </p>
          </div>
          <Switch
            checked={enableLearnerNudges}
            onCheckedChange={(v) => {
              setValue('enableLearnerNudges', v);
              updateMutation.mutate({ enableLearnerNudges: v });
            }}
          />
        </div>

        <Separator className="bg-slate-800" />

        {/* Stalled threshold */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-slate-200">Stalled After (days)</Label>
            <p className="text-xs text-slate-400">
              Flag a learner as stalled after this many inactive days
            </p>
            <Select
              value={String(stalledAfterDays)}
              /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
              onValueChange={(v: any) => {
                if (!v) return;
                const val = parseInt(v, 10);
                setValue('stalledAfterDays', val);
                updateMutation.mutate({ stalledAfterDays: val });
              }}
            >
              <SelectTrigger className="border-slate-800 bg-slate-950 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                {[3, 5, 7, 10, 14].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">At-Risk After (days joined)</Label>
            <p className="text-xs text-slate-400">
              Flag as at-risk if &lt;20% progress after this many days
            </p>
            <Select
              value={String(atRiskAfterDays)}
              /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
              onValueChange={(v: any) => {
                if (!v) return;
                const val = parseInt(v, 10);
                setValue('atRiskAfterDays', val);
                updateMutation.mutate({ atRiskAfterDays: val });
              }}
            >
              <SelectTrigger className="border-slate-800 bg-slate-950 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                {[7, 14, 21, 30].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview of current thresholds */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs font-medium text-slate-400 mb-2">
            Current configuration:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li className="flex items-center gap-1.5">
              ✉️ Manager digest emails sent daily at 09:00 UTC
            </li>
            <li className="flex items-center gap-1.5">
              ⚠️ Learners flagged as stalled after{' '}
              <strong className="text-indigo-400 font-semibold">
                {stalledAfterDays} days
              </strong>{' '}
              of inactivity
            </li>
            <li className="flex items-center gap-1.5">
              📊 At-risk detection kicks in after{' '}
              <strong className="text-indigo-400 font-semibold">
                {atRiskAfterDays} days
              </strong>{' '}
              if completion is below 20%
            </li>
          </ul>
        </div>
      </Card>
    </form>
  );
}
