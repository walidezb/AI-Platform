'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/hooks/useApiClient';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/date';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Sparkles, 
  ClipboardCheck, 
  CheckCircle, 
  Award, 
  Loader2 
} from 'lucide-react';

interface NotificationItemData {
  id: string;
  userId: string;
  organizationId: string;
  type: 'PATH_READY' | 'ASSESSMENT_COMPLETED' | 'MILESTONE_COMPLETED' | 'EXERCISE_GRADED' | 'SYSTEM';
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

interface NotificationListProps {
  onClose?: () => void;
}

const NOTIF_TYPE_STYLES: Record<
  string, 
  { bg: string; icon: React.ReactNode }
> = {
  PATH_READY: {
    bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    icon: <Sparkles className="h-4 w-4" />,
  },
  ASSESSMENT_COMPLETED: {
    bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  MILESTONE_COMPLETED: {
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  EXERCISE_GRADED: {
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    icon: <Award className="h-4 w-4" />,
  },
  SYSTEM: {
    bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    icon: <Bell className="h-4 w-4" />,
  },
};

export function NotificationList({ onClose }: NotificationListProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch notifications
  const { data: notifRes, isLoading } = useQuery<{ success: boolean; data: NotificationItemData[] }>({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get('/notifications?limit=10'),
  });

  const notifications = notifRes?.data || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.patch('/notifications/mark-all-read', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });

  // Mark single as read mutation
  const markSingleReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });

  const handleNotificationClick = async (notif: NotificationItemData) => {
    if (!notif.isRead) {
      await markSingleReadMutation.mutateAsync(notif.id);
    }
    if (onClose) onClose();
    if (notif.ctaUrl) {
      router.push(notif.ctaUrl);
    }
  };

  return (
    <div className="flex flex-col w-full max-h-[420px] bg-card text-card-foreground rounded-xl border border-border shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
        <h3 className="font-heading font-extrabold text-sm text-foreground">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-bold text-primary hover:text-primary/80 h-auto p-0 cursor-pointer"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            {markAllReadMutation.isPending ? 'Marking...' : 'Mark all read'}
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {isLoading && (
          <div className="flex items-center justify-center p-8 text-muted-foreground text-xs font-medium">
            <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
            Loading notifications...
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2.5 opacity-30 text-muted-foreground" />
            <p className="text-xs font-semibold">No notifications yet</p>
          </div>
        )}

        {!isLoading &&
          notifications.map((notif) => {
            const style = NOTIF_TYPE_STYLES[notif.type] || NOTIF_TYPE_STYLES.SYSTEM;
            return (
              <div
                key={notif.id}
                className={cn(
                  'p-4 hover:bg-muted/50 cursor-pointer transition-colors duration-150 relative flex items-start gap-3.5',
                  !notif.isRead && 'bg-primary/5 border-l-2 border-primary'
                )}
                onClick={() => handleNotificationClick(notif)}
              >
                {/* Type Icon */}
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center shrink-0 border border-transparent/5',
                    style.bg
                  )}
                >
                  {style.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className={cn('text-xs font-bold leading-relaxed text-foreground', !notif.isRead && 'font-extrabold')}>
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium leading-normal line-clamp-2">
                    {notif.body}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 font-bold mt-1.5 uppercase tracking-wide">
                    {formatRelativeTime(notif.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border bg-muted/10 text-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs font-bold text-muted-foreground hover:text-foreground w-full cursor-pointer"
          onClick={() => {
            if (onClose) onClose();
            router.push('/learn/dashboard');
          }}
        >
          View all notifications
        </Button>
      </div>
    </div>
  );
}
