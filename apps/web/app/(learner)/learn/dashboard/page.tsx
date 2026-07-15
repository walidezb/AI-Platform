'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useLearnerDashboard } from '@/hooks/learner/useLearnerDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';
import { 
  Zap, 
  Play, 
  Check, 
  Lock, 
  TrendingUp, 
  Clock, 
  Map, 
  BookOpen, 
  FileText, 
  PenTool, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

interface Module {
  id: string;
  sequenceOrder: number;
  title: string;
  description: string;
  moduleType: 'READING' | 'VIDEO' | 'EXERCISE' | 'QUIZ';
  estimatedMinutes: number;
}

interface Milestone {
  id: string;
  sequenceOrder: number;
  title: string;
  description: string;
  estimatedHours: number;
  isLocked: boolean;
  modules: Module[];
}

const QUOTES = [
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
];

export default function LearnerDashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const { path, progress, isLoading } = useLearnerDashboard();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getModuleIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      READING:  <FileText className="h-4 w-4 text-blue-500" />,
      VIDEO:    <Play className="h-4 w-4 text-red-500" />,
      EXERCISE: <PenTool className="h-4 w-4 text-amber-500" />,
      QUIZ:     <HelpCircle className="h-4 w-4 text-violet-500" />,
    };
    return icons[type] || <BookOpen className="h-4 w-4 text-primary" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted rounded" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
          <div className="h-12 w-32 bg-muted rounded-xl" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card border-border min-h-[128px]">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-8 w-8 bg-muted rounded-lg" />
                </div>
                <div className="h-8 w-16 bg-muted rounded mb-2" />
                <div className="h-3 w-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="min-h-[300px] border-border bg-card">
              <CardContent className="p-6 space-y-4">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-6 w-3/4 bg-muted rounded" />
                <div className="h-16 w-full bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-12 w-full bg-muted rounded" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card className="min-h-[300px] border-border bg-card">
              <CardContent className="p-6 space-y-4">
                <div className="h-5 w-40 bg-muted rounded" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 w-full bg-muted rounded-xl" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Handle empty state if no learning path generated yet
  if (!path) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60px] py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 animate-bounce">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Generating Your Learning Path</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          We are building your custom AI-driven curriculum based on your assessment results. This will only take a moment!
        </p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    );
  }

  // Extract Milestone Details
  const milestones: Milestone[] = path.milestones || [];
  const totalMilestones = milestones.length;

  const currentMilestone = milestones.find((m) => m.id === progress?.currentMilestoneId) || milestones[0];
  const currentMilestoneOrder = currentMilestone ? currentMilestone.sequenceOrder : 1;
  const completedMilestonesCount = Math.max(0, currentMilestoneOrder - 1);

  // Extract Module Details
  const currentModules = currentMilestone?.modules || [];
  const nextModule = currentModules.find((m) => m.id === progress?.currentModuleId) || currentModules[0] || {
    id: 'placeholder',
    title: 'Start Learning Path',
    moduleType: 'READING' as const,
    estimatedMinutes: 10,
    description: 'Get started with the first module.'
  };

  // Compute Milestone Progress Percentage
  const currentModuleIndex = currentModules.findIndex((m) => m.id === progress?.currentModuleId);
  const milestoneCompletionPct = currentModules.length > 0 && currentModuleIndex !== -1
    ? Math.round((currentModuleIndex / currentModules.length) * 100)
    : 0;

  // Selected Daily Quote
  const todaysQuote = QUOTES[new Date().getDay() % QUOTES.length];

  return (
    <div className="space-y-8">
      {/* SECTION A — Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-paper p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            {getGreeting()}, {user?.firstName || 'Learner'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">
            Keep the momentum going — you&apos;re on a great streak!
          </p>
        </div>
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 shrink-0 self-start md:self-auto">
          <span className="text-2xl animate-pulse">🔥</span>
          <div>
            <p className="font-bold text-amber-500 text-lg leading-none">
              {progress?.streakDays || 0} days
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
              Current streak
            </p>
          </div>
        </div>
      </div>

      {/* SECTION B — Progress Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Overall Completion */}
        <Card className="bg-card border-border hover:border-primary/20 transition-all duration-200 shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[128px]">
            <div className="flex justify-between items-start">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                Overall Completion
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="font-heading text-3xl font-extrabold tracking-tight text-foreground flex items-baseline">
                <AnimatedNumber value={progress?.overallCompletionPct || 0} suffix="%" />
              </div>
              <div className="mt-2.5">
                <ProgressBar 
                  value={progress?.overallCompletionPct || 0} 
                  variant="success" 
                  size="sm" 
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mt-1.5">
                of your learning path completed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Time Invested */}
        <Card className="bg-card border-border hover:border-primary/20 transition-all duration-200 shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[128px]">
            <div className="flex justify-between items-start">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                Time Invested
              </span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
                {Math.floor((progress?.timeSpentMinutes || 0) / 60)}h {(progress?.timeSpentMinutes || 0) % 60}m
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">
                total learning time recorded
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Current Milestone */}
        <Card className="bg-card border-border hover:border-primary/20 transition-all duration-200 shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[128px]">
            <div className="flex justify-between items-start">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                Milestones completed
              </span>
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20">
                <Map className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
                {completedMilestonesCount} of {totalMilestones}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">
                milestones completed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Path Estimated Time */}
        <Card className="bg-card border-border hover:border-primary/20 transition-all duration-200 shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[128px]">
            <div className="flex justify-between items-start">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                Total Path Length
              </span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
                ~{path.estimatedHours || 0}h
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">
                total estimated study hours
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Focus Area & Path Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SECTION C — Current Milestone Focus Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/80 bg-card p-6 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full blur-3xl -z-10" />
            
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 fill-primary" />
                  Continue Learning
                </p>
                <h2 className="font-heading text-2xl font-extrabold text-foreground tracking-tight">
                  {currentMilestone?.title}
                </h2>
                <p className="text-muted-foreground text-sm mt-1.5 font-medium leading-relaxed">
                  {currentMilestone?.description}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 self-start sm:self-auto font-bold px-3 py-1">
                Milestone {currentMilestone?.sequenceOrder || 1}
              </Badge>
            </div>

            {/* Milestone progress bar */}
            <div className="mb-6 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span>Milestone Progress</span>
                <span>{milestoneCompletionPct}%</span>
              </div>
              <ProgressBar
                value={milestoneCompletionPct}
                variant="default"
                size="md"
                animated
              />
            </div>

            {/* Next module to do */}
            <div className="bg-muted/40 rounded-xl border border-border/60 p-4 mb-6 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                {getModuleIcon(nextModule.moduleType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate leading-normal">
                  {nextModule.title}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  {nextModule.estimatedMinutes} min · {nextModule.moduleType.toLowerCase()}
                </p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0 font-bold border-primary/30 text-primary">
                Up next
              </Badge>
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/95 text-white font-extrabold shadow-md hover:shadow-lg transition-all duration-200 py-6 text-base"
              onClick={() => router.push(`/learn/module/${nextModule.id}`)}
            >
              <Play className="h-5 w-5 mr-2 fill-current" />
              Continue Learning
            </Button>
          </Card>
        </div>

        {/* SECTION D — Learning Path Overview */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-extrabold text-foreground">
                Your Path Overview
              </h3>
              <Link 
                href="/learn/path" 
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), "text-xs font-bold text-primary")}
              >
                View Full Path →
              </Link>
            </div>

            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {milestones.map((milestone, i) => {
                const isCompleted = milestone.sequenceOrder < currentMilestoneOrder;
                const isCurrent = milestone.id === currentMilestone?.id;
                const isLocked = milestone.sequenceOrder > currentMilestoneOrder;

                return (
                  <div key={milestone.id}
                    className={cn(
                      "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all duration-200",
                      isCurrent && "border-primary/40 bg-primary/5 shadow-xs",
                      isCompleted && "border-emerald-500/20 bg-emerald-500/5",
                      isLocked && "opacity-50 cursor-not-allowed border-border/60 bg-muted/20",
                      !isLocked && !isCurrent && "border-border hover:border-primary/20 hover:bg-muted/10"
                    )}
                  >
                    {/* Status icon badge */}
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-200",
                      isCompleted && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                      isCurrent && "bg-primary/10 border-primary/20 text-primary",
                      isLocked && "bg-muted border-border text-muted-foreground",
                    )}>
                      {isCompleted ? (
                        <Check className="h-4 w-4 stroke-[3]" />
                      ) : isCurrent ? (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                      ) : isLocked ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <span className="text-xs font-extrabold">{i + 1}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-bold truncate leading-normal text-foreground",
                        isLocked && "text-muted-foreground font-semibold"
                      )}>
                        {milestone.title}
                      </p>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                        {milestone.modules?.length || 0} modules · ~{milestone.estimatedHours}h
                      </p>
                    </div>

                    {/* Status Badge */}
                    {isCompleted && (
                      <StatusBadge status="completed" className="scale-90" />
                    )}
                    {isCurrent && (
                      <StatusBadge status="in-progress" className="scale-90" />
                    )}
                    {isLocked && (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION E — Motivational Quote */}
      <Card className="bg-paper border border-border shadow-xs p-5 max-w-4xl mx-auto text-center relative overflow-hidden">
        <div className="absolute -top-10 -left-10 h-24 w-24 bg-primary/5 rounded-full blur-2xl" />
        <p className="text-sm italic text-muted-foreground font-medium leading-relaxed">
          &ldquo;{todaysQuote.text}&rdquo;
        </p>
        <p className="text-xs text-primary font-bold mt-2 uppercase tracking-wider">
          — {todaysQuote.author}
        </p>
      </Card>
    </div>
  );
}
