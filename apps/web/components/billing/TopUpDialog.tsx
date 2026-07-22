'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createApiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const TOP_UP_OPTIONS = [
  { tokens: 500_000, label: '500K tokens', price: '$5.00' },
  { tokens: 1_000_000, label: '1M tokens', price: '$10.00' },
  { tokens: 5_000_000, label: '5M tokens', price: '$50.00' },
];

export function TopUpDialog() {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [selected, select] = useState(TOP_UP_OPTIONS[1]);

  const purchase = useMutation({
    mutationFn: async () => {
      const client = createApiClient(getToken);
      return client.post('/billing/increase-budget', {
        tokenAmount: selected.tokens,
      });
    },
    onSuccess: () => {
      toast.success(
        `💳 Redirecting to payment... Adding ${selected.label} for ${selected.price}`,
      );
      window.open('/manage/billing', '_self');
      setOpen(false);
    },
    onError: () => {
      toast.error('Purchase failed. Please try again.');
    },
  });

  return (
    <>
      <Button
        size="sm"
        className="bg-rose-500 hover:bg-rose-600 text-white font-medium"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Buy More Tokens
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Purchase Token Top-Up</DialogTitle>
            <DialogDescription>
              Add tokens to your current billing period. Rate: $0.01 per 1,000
              tokens.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {TOP_UP_OPTIONS.map((opt) => (
              <button
                key={opt.tokens}
                type="button"
                onClick={() => select(opt)}
                className={cn(
                  'w-full flex items-center justify-between',
                  'px-4 py-3 rounded-xl border text-sm',
                  'transition-all text-left',
                  selected.tokens === opt.tokens
                    ? 'border-primary bg-primary/10 font-semibold'
                    : 'border-border hover:border-primary/30',
                )}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="text-muted-foreground">{opt.price}</span>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={purchase.isPending}
              onClick={() => purchase.mutate()}
              className="bg-primary"
            >
              {purchase.isPending ? 'Processing...' : `Pay ${selected.price}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
