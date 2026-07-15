'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/hooks/useApiClient';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { NotificationList } from './NotificationList';
import { Bell } from 'lucide-react';

export function NotificationBell() {
  const apiClient = useApiClient();
  const [open, setOpen] = useState(false);

  // Fetch unread count
  const { data: countData } = useQuery<{ success: boolean; data: { count: number } }>({
    queryKey: ['notification-count'],
    queryFn: () => apiClient.get('/notifications/unread-count'),
    refetchInterval: 30000, // poll every 30s
  });

  const unreadCount = countData?.data?.count || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button variant="ghost" size="icon" className="relative cursor-pointer">
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center animate-in zoom-in duration-200">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 overflow-hidden border border-border bg-card shadow-lg rounded-xl mt-1 z-50">
        <NotificationList onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
