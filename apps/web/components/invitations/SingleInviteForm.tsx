'use client';

import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDepartments } from '@/hooks/manager/useDepartments';
import { createApiClient } from '@/lib/api-client';
import { notify } from '@/lib/toast';

type SingleInviteFormProps = {
  onSuccess: () => void;
};

export function SingleInviteForm({ onSuccess }: SingleInviteFormProps) {
  const { getToken } = useAuth();
  const { departments } = useDepartments();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      notify.error('Please fill in both name and email');
      return;
    }

    setIsSubmitting(true);
    try {
      const client = createApiClient(getToken);
      await client.post('/invitations/invite', {
        fullName: fullName.trim(),
        email: email.trim(),
        jobTitle: jobTitle.trim() || undefined,
        departmentId: departmentId || undefined,
      });

      setFullName('');
      setEmail('');
      setJobTitle('');
      setDepartmentId(undefined);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send invite';
      notify.error('Failed to send invitation', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="single-name" className="text-xs font-medium text-slate-300">
          Full Name
        </Label>
        <Input
          id="single-name"
          placeholder="e.g. Alice Smith"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="h-9 border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="single-email" className="text-xs font-medium text-slate-300">
          Email Address
        </Label>
        <Input
          id="single-email"
          type="email"
          placeholder="e.g. alice@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-9 border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="single-job" className="text-xs font-medium text-slate-300">
            Job Title
          </Label>
          <Input
            id="single-job"
            placeholder="e.g. Senior Developer"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="h-9 border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="single-dept" className="text-xs font-medium text-slate-300">
            Department
          </Label>
          <Select
            value={departmentId || '__none__'}
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            onValueChange={(val: any) =>
              setDepartmentId(!val || val === '__none__' ? undefined : (val as string))
            }
          >
            <SelectTrigger id="single-dept" className="h-9 border-slate-800 bg-slate-950 text-slate-100">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
              <SelectItem value="__none__">None</SelectItem>
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
        disabled={isSubmitting}
        className="w-full h-9 bg-gradient-primary border-0 text-white font-semibold"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Invitation'
        )}
      </Button>
    </form>
  );
}
