'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Mail, Download } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ShareLinkDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  inviteLink: string;
  onResendEmail: () => Promise<void>;
}

export function ShareLinkDialog({
  isOpen,
  onOpenChange,
  employeeName,
  inviteLink,
  onResendEmail,
}: ShareLinkDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Invitation link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to copy link');
    }
  };

  const handleDownloadQR = () => {
    try {
      const svgElement = document.getElementById('qr-code-svg');
      if (!svgElement) {
        toast.error('QR code element not found');
        return;
      }
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `invite-qr-${employeeName.replace(/\s+/g, '-').toLowerCase()}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
      toast.success('QR Code SVG downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download QR code');
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResendEmail();
    } catch (err) {
      console.error(err);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-950 border border-slate-900 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white tracking-tight">Share Onboarding Link</DialogTitle>
          <DialogDescription className="text-xs text-slate-400 mt-2">
            Send this link to <strong className="text-white font-semibold">{employeeName}</strong> to begin their AI-powered learning journey.
          </DialogDescription>
        </DialogHeader>

        {/* Link input with copy button */}
        <div className="flex gap-2 items-center mt-3 select-none">
          <Input
            value={inviteLink}
            readOnly
            className="font-mono text-xs bg-slate-900 border-slate-800 text-white flex-1 select-all h-9"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className={`h-9 w-9 shrink-0 bg-slate-900 border-slate-800 hover:bg-slate-800 ${
              copied ? 'text-emerald-400 border-emerald-400/30' : 'text-slate-300'
            }`}
          >
            {copied ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
          </Button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-2 py-4 select-none">
          <p className="text-xs text-muted-foreground">Or scan QR code</p>
          <div className="p-3 bg-white rounded-xl shadow-glow-sm">
            <QRCodeSVG
              id="qr-code-svg"
              value={inviteLink}
              size={160}
              bgColor="#ffffff"
              fgColor="#0f1220"
              level="M"
            />
          </div>
          <p className="text-[10px] text-muted-foreground select-none">
            Right-click to save, or click Download QR below
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-2 select-none">
          <Button
            variant="outline"
            className="flex-1 text-xs font-bold border-slate-800 hover:bg-slate-900"
            onClick={handleResend}
            disabled={isResending}
          >
            <Mail className="h-4 w-4 mr-2 shrink-0" />
            {isResending ? 'Resending...' : 'Resend Email'}
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-xs font-bold border-slate-800 hover:bg-slate-900"
            onClick={handleDownloadQR}
          >
            <Download className="h-4 w-4 mr-2 shrink-0" />
            Download QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
