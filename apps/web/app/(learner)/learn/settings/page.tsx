'use client';

import React, { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useApiClient } from '@/hooks/useApiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { notify } from '@/lib/toast';
import { Settings, ShieldAlert, Award, Globe, BookOpen, Clock, Mail } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  jobTitle?: string;
  preferredLanguage?: 'EN' | 'AR';
}

interface AssessmentSummary {
  identifiedRole: string | null;
  experienceLevel: string | null;
  strongAreas: string[];
  weakAreas: string[];
  learningGoals: string[];
  completedAt: string | null;
}

export default function LearnerSettingsPage() {
  const { user: clerkUser } = useUser();
  const apiClient = useApiClient();

  // Local state for preferences
  const [jobTitle, setJobTitle] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'EN' | 'AR'>('EN');
  const [dailyGoal, setDailyGoal] = useState('30 min');
  const [emailNotifications, setEmailNotifications] = useState(true);

  // 1. Fetch user profile from DB
  const { data: userRes, refetch: refetchUser } = useQuery<{ success: boolean; data: User }>({
    queryKey: ['me'],
    queryFn: () => apiClient.get<{ success: boolean; data: User }>('/auth/me'),
  });
  const dbUser = userRes?.data;

  // Initialize form fields when DB user loads
  useEffect(() => {
    if (dbUser) {
      setJobTitle(dbUser.jobTitle || '');
      setPreferredLanguage(dbUser.preferredLanguage || 'EN');
    }
  }, [dbUser]);

  // Load preferences from local storage on mount
  useEffect(() => {
    const savedGoal = localStorage.getItem('learner_daily_goal');
    if (savedGoal) setDailyGoal(savedGoal);

    const savedNotifications = localStorage.getItem('learner_email_notifications');
    if (savedNotifications !== null) {
      setEmailNotifications(savedNotifications === 'true');
    }
  }, []);

  // 2. Fetch assessment details
  const { data: assessment, isLoading: assessmentLoading } = useQuery<AssessmentSummary | null>({
    queryKey: ['my-assessment'],
    queryFn: () => apiClient.get<AssessmentSummary | null>('/users/me/assessment'),
  });

  // 3. Mutation for updating profile
  const updateProfileMutation = useMutation<unknown, Error, { jobTitle: string; preferredLanguage: 'EN' | 'AR' }>({
    mutationFn: (data: { jobTitle: string; preferredLanguage: 'EN' | 'AR' }) =>
      apiClient.patch<unknown>('/users/me', data),
    onSuccess: () => {
      refetchUser();
      notify.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      console.error('Update profile error:', error);
      notify.error('Failed to update profile settings');
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      jobTitle,
      preferredLanguage,
    });
  };

  const handleGoalChange = (val: string) => {
    setDailyGoal(val);
    localStorage.setItem('learner_daily_goal', val);
    notify.success(`Daily goal updated to ${val}`);
  };

  const handleNotificationsChange = (checked: boolean) => {
    setEmailNotifications(checked);
    localStorage.setItem('learner_email_notifications', String(checked));
    notify.success(checked ? 'Email notifications enabled' : 'Email notifications disabled');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, learning preferences, and view skill profile"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Navigation Sidebar shortcut */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4 shadow-xs">
            <div className="flex items-center gap-3 px-2 py-3 border-b border-border/80">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Preferences</p>
                <p className="text-xs text-muted-foreground font-medium">Personalize learning</p>
              </div>
            </div>
            <nav className="space-y-1 mt-4">
              <a href="#profile" className="flex items-center gap-2.5 px-3 py-2 text-sm font-bold text-primary bg-primary/5 rounded-lg">
                <Settings className="h-4 w-4" />
                Profile Setup
              </a>
              <a href="#learning" className="flex items-center gap-2.5 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg">
                <BookOpen className="h-4 w-4" />
                Study Goals
              </a>
              <a href="#assessment" className="flex items-center gap-2.5 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg">
                <Award className="h-4 w-4" />
                Assessment Results
              </a>
            </nav>
          </div>
        </div>

        {/* Settings Forms Column */}
        <div className="md:col-span-2 space-y-8">
          
          {/* SECTION A — Profile */}
          <Card id="profile" className="bg-card border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Profile Information</CardTitle>
              <CardDescription>Update your job profile information and workspace preferred language.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Clerk Avatar & User Details */}
              <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                <UserButton />
                <div>
                  <p className="text-sm font-bold text-foreground">{clerkUser?.fullName || dbUser?.fullName}</p>
                  <p className="text-xs text-muted-foreground font-medium">{clerkUser?.primaryEmailAddress?.emailAddress || dbUser?.email}</p>
                </div>
              </div>

              {/* Job Title field */}
              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="text-sm font-bold text-foreground">Job Title</Label>
                <Input
                  id="jobTitle"
                  type="text"
                  placeholder="e.g. Software Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="bg-background border-border"
                />
              </div>

              {/* Language Selection Toggle */}
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-primary" />
                  Preferred Language
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={preferredLanguage === 'EN' ? 'default' : 'outline'}
                    onClick={() => setPreferredLanguage('EN')}
                    className="font-bold px-5"
                  >
                    English (EN)
                  </Button>
                  <Button
                    type="button"
                    variant={preferredLanguage === 'AR' ? 'default' : 'outline'}
                    onClick={() => setPreferredLanguage('AR')}
                    className="font-bold px-5"
                  >
                    العربية (AR)
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/60 pt-4 flex justify-end">
              <Button 
                onClick={handleSaveProfile} 
                disabled={updateProfileMutation.isPending}
                className="font-bold bg-primary hover:bg-primary/95 text-white"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </CardFooter>
          </Card>

          {/* SECTION B — Learning Preferences */}
          <Card id="learning" className="bg-card border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Learning Preferences</CardTitle>
              <CardDescription>Personalize study schedules and communication channels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Daily Goal select */}
              <div className="space-y-2">
                <Label htmlFor="dailyGoal" className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  Daily Study Goal
                </Label>
                <select
                  id="dailyGoal"
                  value={dailyGoal}
                  onChange={(e) => handleGoalChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="15 min">15 minutes / day</option>
                  <option value="30 min">30 minutes / day</option>
                  <option value="1 hour">1 hour / day</option>
                  <option value="2 hours">2 hours / day</option>
                </select>
              </div>

              {/* Email notifications Switch */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/60">
                <div className="space-y-1 pr-4">
                  <Label htmlFor="emailNotifications" className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-primary" />
                    Email Progress Summaries
                  </Label>
                  <p className="text-xs text-muted-foreground font-medium">Receive weekly updates on milestone completions and performance.</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={emailNotifications}
                  onCheckedChange={handleNotificationsChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION C — My Assessment */}
          <Card id="assessment" className="bg-card border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Onboarding Assessment Results</CardTitle>
              <CardDescription>Your verified skill profile from the onboarding interactive assessment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {assessmentLoading ? (
                <div className="space-y-3">
                  <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
                  <div className="h-8 w-1/2 bg-muted animate-pulse rounded" />
                </div>
              ) : !assessment ? (
                <div className="text-center py-6">
                  <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-bold text-muted-foreground">No completed assessment found</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Role and Level badge */}
                  <div className="flex items-center justify-between bg-muted/40 p-4 rounded-xl border border-border/80">
                    <div>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Target Role Profile</p>
                      <p className="text-base font-bold text-foreground mt-0.5">{assessment.identifiedRole || 'General Learner'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider text-right">Expertise Level</p>
                      <Badge className="font-extrabold uppercase bg-primary hover:bg-primary/95 text-white mt-1 px-3 py-0.5">
                        {assessment.experienceLevel || 'Beginner'}
                      </Badge>
                    </div>
                  </div>

                  {/* Strong Areas */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Strong Areas</Label>
                    <div className="flex flex-wrap gap-2">
                      {assessment.strongAreas && assessment.strongAreas.length > 0 ? (
                        assessment.strongAreas.map((area: string) => (
                          <Badge key={area} variant="secondary" className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold px-3 py-1 text-xs">
                            {area}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">None identified.</p>
                      )}
                    </div>
                  </div>

                  {/* Growth Areas */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Growth Areas</Label>
                    <div className="flex flex-wrap gap-2">
                      {assessment.weakAreas && assessment.weakAreas.length > 0 ? (
                        assessment.weakAreas.map((area: string) => (
                          <Badge key={area} variant="secondary" className="bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold px-3 py-1 text-xs">
                            {area}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">None identified.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t border-border/60 pt-4 flex flex-col items-stretch sm:items-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span>
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                        className="w-full sm:w-auto font-bold opacity-60 cursor-not-allowed"
                      >
                        Retake Assessment
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">Contact your manager to reset your assessment</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardFooter>
          </Card>

        </div>
      </div>
    </div>
  );
}
