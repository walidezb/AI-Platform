'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import {
  Download,
  FileUp,
  Loader2,
  Check,
  AlertCircle,
  ArrowLeft,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { createApiClient } from '@/lib/api-client';
import { parseCSV, generateCSVTemplate } from '@/lib/csv-parser';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (count: number) => void;
};

export function BulkImportDialog({ open, onOpenChange, onSuccess }: Props) {
  const { getToken } = useAuth();
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>(
    'upload',
  );
  const [parsed, setParsed] = useState<ReturnType<typeof parseCSV> | null>(
    null,
  );
  const [filename, setFilename] = useState('');
  const [importResult, setResult] = useState<{
    invited: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isDragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSV(text);
      setParsed(result);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    const validEmployees = parsed.employees.filter(
      (e) => e._errors.length === 0,
    );
    if (!validEmployees.length) return;

    setStep('importing');

    try {
      const client = createApiClient(getToken);
      const response = await client.post<{
        success: boolean;
        data?: { invited?: number; failed?: number; errors?: string[] };
        invited?: number;
        failed?: number;
        errors?: string[];
      }>('/invitations/bulk', {
        employees: validEmployees.map((e) => ({
          fullName: e.fullName,
          email: e.email,
          department: e.department || undefined,
          jobTitle: e.jobTitle || undefined,
          role: 'LEARNER',
        })),
      });

      const resData = response.data || response;
      setResult({
        invited: resData.invited ?? validEmployees.length,
        failed: resData.failed ?? 0,
        errors: resData.errors ?? [],
      });
      setStep('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Please try again';
      toast.error('Import failed', {
        description: msg,
      });
      setStep('preview');
    }
  };

  const reset = () => {
    setStep('upload');
    setParsed(null);
    setFilename('');
    setResult(null);
  };

  const downloadTemplate = () => {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invite-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          onOpenChange(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-w-2xl">
          {/* ── STEP 1: UPLOAD ── */}
          {step === 'upload' && (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle>Bulk Import Employees</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to invite multiple employees at once.
                </DialogDescription>
              </DialogHeader>

              {/* Download template */}
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>

              {/* Drop zone */}
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
                className={cn(
                  'flex flex-col items-center justify-center',
                  'h-40 rounded-xl border-2 border-dashed cursor-pointer',
                  'transition-all duration-200',
                  isDragging
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-secondary/20',
                )}
              >
                <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
                  <FileUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                  Drop CSV file here, or{' '}
                  <span className="text-primary">browse</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Columns: fullName, email, department, jobTitle
                </p>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          )}

          {/* ── STEP 2: PREVIEW ── */}
          {step === 'preview' && parsed && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Preview Import</DialogTitle>
                <DialogDescription>
                  {filename} — {parsed.totalRows} rows found,{' '}
                  <span className="text-emerald-400">
                    {parsed.validRows} valid
                  </span>
                  {parsed.totalRows - parsed.validRows > 0 && (
                    <span className="text-rose-400">
                      , {parsed.totalRows - parsed.validRows} with errors
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {/* Global errors */}
              {parsed.errors.length > 0 && (
                <Card className="p-3 border-rose-500/20 bg-rose-500/5">
                  {parsed.errors.map((e, i) => (
                    <p key={i} className="text-xs text-rose-400">
                      ⚠ {e}
                    </p>
                  ))}
                </Card>
              )}

              {/* Preview table — max 10 rows visible, scrollable */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-muted-foreground">
                          #
                        </th>
                        <th className="text-left px-3 py-2 text-muted-foreground">
                          Name
                        </th>
                        <th className="text-left px-3 py-2 text-muted-foreground">
                          Email
                        </th>
                        <th className="text-left px-3 py-2 text-muted-foreground">
                          Department
                        </th>
                        <th className="text-left px-3 py-2 text-muted-foreground">
                          Job Title
                        </th>
                        <th className="text-left px-3 py-2 text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.employees.map((emp) => (
                        <tr
                          key={emp._rowIndex}
                          className={cn(
                            'border-t border-border',
                            emp._errors.length > 0
                              ? 'bg-rose-500/5'
                              : 'hover:bg-secondary/30',
                          )}
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {emp._rowIndex}
                          </td>
                          <td className="px-3 py-2 font-medium max-w-[100px] truncate">
                            {emp.fullName || (
                              <span className="text-rose-400 italic">
                                missing
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[140px] truncate">
                            {emp.email || (
                              <span className="text-rose-400 italic">
                                missing
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {emp.department || '—'}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {emp.jobTitle || '—'}
                          </td>
                          <td className="px-3 py-2">
                            {emp._errors.length === 0 ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <Check className="h-3 w-3" /> Valid
                              </span>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="text-rose-400 flex items-center gap-1 cursor-default">
                                    <AlertCircle className="h-3 w-3" />
                                    Error
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {emp._errors.join(', ')}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    reset();
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Re-upload
                </Button>
                <Button
                  className="flex-1 bg-gradient-primary"
                  onClick={handleImport}
                  disabled={parsed.validRows === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Import {parsed.validRows} Employee
                  {parsed.validRows !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: IMPORTING ── */}
          {step === 'importing' && (
            <div className="py-12 flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-medium">Sending invitations...</p>
              <p className="text-sm text-muted-foreground">
                This may take a moment for large imports.
              </p>
            </div>
          )}

          {/* ── STEP 4: DONE ── */}
          {step === 'done' && importResult && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Import Complete</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 text-center border-emerald-500/20 bg-emerald-500/5">
                  <p className="text-3xl font-bold text-emerald-400">
                    {importResult.invited}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Invitations Sent
                  </p>
                </Card>
                {importResult.failed > 0 && (
                  <Card className="p-4 text-center border-rose-500/20 bg-rose-500/5">
                    <p className="text-3xl font-bold text-rose-400">
                      {importResult.failed}
                    </p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </Card>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <Card className="p-3 border-rose-500/20 bg-rose-500/5">
                  <p className="text-xs font-medium text-rose-400 mb-1">
                    Failed rows:
                  </p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {e}
                    </p>
                  ))}
                </Card>
              )}

              <Button
                className="w-full bg-gradient-primary"
                onClick={() => {
                  onSuccess(importResult.invited);
                  onOpenChange(false);
                  reset();
                }}
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
