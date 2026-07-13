'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Sparkles, 
  Award, 
  Clock, 
  UserPlus, 
  BarChart3, 
  Building2,
  ArrowRight
} from 'lucide-react';

import { PageHeader } from '@/components/ui/PageHeader';
import { StatsCard } from '@/components/ui/StatsCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SkeletonStats } from '@/components/ui/LoadingSkeleton';

import { useOrgStats } from '@/hooks/manager/useOrgStats';
import { useRecentActivity } from '@/hooks/manager/useRecentActivity';
import { timeAgo } from '@/lib/utils/date';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  fullName: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface DashboardViewProps {
  user: User;
}

export function DashboardView({ user }: DashboardViewProps) {
  const orgId = user.organization?.id || '';
  const orgName = user.organization?.name || 'Your Company';

  const { data: stats, isLoading: isStatsLoading } = useOrgStats(orgId);
  const { data: activities, isLoading: isActivityLoading } = useRecentActivity();

  const totalEmployees = stats?.totalEmployees ?? 0;
  const showWelcomeBanner = !isStatsLoading && totalEmployees === 0;

  // Render recent activity description based on action type
  const getActivityMessage = (employeeName: string, action: string) => {
    if (action.includes('milestone')) {
      return (
        <span>
          <span className="font-semibold text-white">{employeeName}</span> completed milestone <span className="text-primary font-semibold">🏆</span>
        </span>
      );
    }
    if (action.includes('module')) {
      return (
        <span>
          <span className="font-semibold text-white">{employeeName}</span> completed module
        </span>
      );
    }
    if (action.includes('joined')) {
      return (
        <span>
          <span className="font-semibold text-white">{employeeName}</span> joined the platform
        </span>
      );
    }
    return (
      <span>
        <span className="font-semibold text-white">{employeeName}</span> {action}
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Manager Dashboard"
        subtitle={`Overview and metrics for ${orgName}`}
      />

      {/* 5. WELCOME BANNER (show only if totalEmployees === 0) */}
      {showWelcomeBanner && (
        <div className="gradient-border rounded-xl p-6 mb-6 bg-slate-900/40 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-heading text-2xl font-bold text-white tracking-tight">
                Welcome to EZ LEARN! 👋
              </h2>
              <p className="text-muted-foreground text-sm">
                You&apos;re all set. Start by inviting your first employee.
              </p>
            </div>
            <Link href="/manage/invitations">
              <Button size="lg" className="bg-gradient-primary border-0 text-white font-semibold shadow-glow-sm hover:opacity-90 transition-opacity">
                Invite First Employee <ArrowRight className="h-4 w-4 ml-1.5 shrink-0" />
              </Button>
            </Link>
          </div>
          
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-900 pt-6">
            {[
              'Invite employees',
              'They complete AI assessment',
              'AI builds their path',
              'Track their progress'
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-slate-400">
                <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. STATS SECTION (top of dashboard) */}
      {isStatsLoading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            label="Total Employees"
            value={stats?.totalEmployees ?? 0}
            icon={Users}
            variant="default"
          />

          <StatsCard
            label="Active Learners"
            value={stats?.activeEmployees ?? 0}
            icon={BookOpen}
            variant="info"
            trendText={`of ${totalEmployees} employees`}
          />

          <StatsCard
            label="Avg Completion"
            value={`${stats?.avgCompletionPct ?? 0}%`}
            icon={TrendingUp}
            variant="success"
          >
            <ProgressBar value={stats?.avgCompletionPct ?? 0} size="sm" variant="success" animated />
          </StatsCard>

          <StatsCard
            label="Paths Generated"
            value={stats?.pathsGenerated ?? 0}
            icon={Sparkles}
            variant="info"
          />

          <StatsCard
            label="Completed Training"
            value={stats?.completedEmployees ?? 0}
            icon={Award}
            variant="success"
          />

          <StatsCard
            label="Not Started"
            value={stats?.notStartedEmployees ?? 0}
            icon={Clock}
            variant={(stats?.notStartedEmployees ?? 0) > 0 ? "warning" : "default"}
            className={cn(
              (stats?.notStartedEmployees ?? 0) > 0 && "border-warning/35 bg-warning/5"
            )}
          />
        </div>
      )}

      {/* 3. QUICK ACTIONS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card A: Invite Employees */}
        <Card className="bg-slate-900/30 border border-border p-6 flex flex-col justify-between relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-primary/5 blur-xl pointer-events-none" />
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4">
              <UserPlus className="h-5 w-5" />
            </div>
            <h3 className="font-heading text-lg font-bold text-white mb-2">Invite Employees</h3>
            <p className="text-muted-foreground text-xs leading-relaxed mb-6">
              Send onboarding links to new team members and start their AI diagnostics.
            </p>
          </div>
          <Link href="/manage/invitations" className="w-full">
            <Button className="w-full bg-slate-950 border border-slate-800 text-slate-300 font-semibold hover:text-white hover:bg-slate-900 transition-colors">
              Send Invites
            </Button>
          </Link>
        </Card>

        {/* Card B: View Team Progress */}
        <Card className="bg-slate-900/30 border border-border p-6 flex flex-col justify-between relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-accent/5 blur-xl pointer-events-none" />
          <div>
            <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mb-4">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="font-heading text-lg font-bold text-white mb-2">View Team Progress</h3>
            <p className="text-muted-foreground text-xs leading-relaxed mb-6">
              See how your team is progressing, aggregate completions, and diagnostic gaps.
            </p>
          </div>
          <Link href="/manage/team" className="w-full">
            <Button className="w-full bg-slate-950 border border-slate-800 text-slate-300 font-semibold hover:text-white hover:bg-slate-900 transition-colors">
              View Team
            </Button>
          </Link>
        </Card>

        {/* Card C: Set Up Departments */}
        <Card className="bg-slate-900/30 border border-border p-6 flex flex-col justify-between relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-primary/5 blur-xl pointer-events-none" />
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="font-heading text-lg font-bold text-white mb-2">Set Up Departments</h3>
            <p className="text-muted-foreground text-xs leading-relaxed mb-6">
              Organize your team by department and custom role learning focus areas.
            </p>
          </div>
          <Link href="/manage/settings" className="w-full">
            <Button className="w-full bg-slate-950 border border-slate-800 text-slate-300 font-semibold hover:text-white hover:bg-slate-900 transition-colors">
              Configure
            </Button>
          </Link>
        </Card>
      </div>

      {/* 4. RECENT ACTIVITY SECTION */}
      <Card className="bg-card border border-border p-6 relative overflow-hidden">
        <h3 className="font-heading text-lg font-bold text-white mb-6">Recent Activity</h3>
        
        {isActivityLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-900/40">
                <div className="h-8 w-8 rounded-full bg-slate-900 animate-pulse shrink-0" />
                <div className="flex-grow space-y-2">
                  <div className="h-3.5 bg-slate-900 rounded w-1/3 animate-pulse" />
                  <div className="h-2.5 bg-slate-900 rounded w-1/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !activities || activities.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No activity yet"
            description="Recent milestones, modules, and diagnostic updates will appear here"
          />
        ) : (
          <div className="divide-y divide-slate-900/40">
            {activities.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                <Avatar className="h-8 w-8 shrink-0">
                  {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={item.employeeName} />}
                  <AvatarFallback className="text-[10px] bg-slate-950 font-bold text-slate-500 border border-slate-900">
                    {item.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-normal">
                    {getActivityMessage(item.employeeName, item.action)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(item.createdAt)}</p>
                </div>
                
                <StatusBadge 
                  status={item.type} 
                  className="ml-auto scale-90 select-none font-bold" 
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
