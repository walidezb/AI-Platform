'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SignUp, useUser } from '@clerk/nextjs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Loader2, 
  Check, 
  X
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/Logo';
import { StepIndicator } from '@/components/register/StepIndicator';
import { createOrganization } from './actions';
import { notify } from '@/lib/toast';

const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  industry: z.string().min(1, 'Please select an industry'),
  companySize: z.string().min(1, 'Please select company size'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUser();

  // Determine current step based on search param ?step=1|2|3
  const stepParam = searchParams.get('step');
  const initialStep = stepParam ? parseInt(stepParam, 10) : 1;
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(
    initialStep === 1 || initialStep === 2 || initialStep === 3 
      ? (initialStep as 1 | 2 | 3) 
      : 1
  );

  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [creationStatus, setCreationStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [createdOrgSlug, setCreatedOrgSlug] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      companyName: '',
      slug: '',
      industry: '',
      companySize: '',
    }
  });

  const companyName = watch('companyName');
  const slug = watch('slug');

  // Sync step changes in URL search params
  useEffect(() => {
    if (stepParam) {
      const stepVal = parseInt(stepParam, 10);
      if (stepVal === 1 || stepVal === 2 || stepVal === 3) {
        setCurrentStep(stepVal as 1 | 2 | 3);
      }
    }
  }, [stepParam]);

  // Auto-generate slug from Company Name
  useEffect(() => {
    if (companyName && currentStep === 1) {
      const autoSlug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', autoSlug, { shouldValidate: true });
    }
  }, [companyName, setValue, currentStep]);

  // Real-time debounced slug availability check
  useEffect(() => {
    if (!slug || slug.length < 2) {
      setSlugStatus('idle');
      return;
    }
    setSlugStatus('checking');

    const checkAvailability = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/orgs/slug-check/${slug}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSlugStatus(data.available ? 'available' : 'taken');
      } catch {
        setSlugStatus('idle');
      }
    };

    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  // Handle Step 1 form submission
  const onSubmitStep1 = (data: RegisterFormValues) => {
    if (slugStatus !== 'available') {
      notify.error('URL Unavailable', 'Please choose a different company URL.');
      return;
    }
    sessionStorage.setItem('ez_learn_reg_details', JSON.stringify(data));
    router.push('/register?step=2');
  };

  // Step 3 logic: Auto-create organization and sync user once signed in via Clerk
  useEffect(() => {
    if (isUserLoaded && user && currentStep === 3 && creationStatus === 'idle') {
      const stored = sessionStorage.getItem('ez_learn_reg_details');
      if (stored) {
        setCreationStatus('creating');
        const details = JSON.parse(stored);

        const setupWorkspace = async () => {
          try {
            // 1. Create Organization in backend database
            await createOrganization({
              name: details.companyName,
              slug: details.slug,
              industry: details.industry,
              clerkId: user.id,
              email: user.primaryEmailAddress?.emailAddress || '',
              fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin User',
            });

            // 2. Sync Clerk User to PostgreSQL
            const syncRes = await fetch('/api/auth/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                email: user.primaryEmailAddress?.emailAddress,
                fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin User',
                role: 'ORG_ADMIN',
              }),
            });

            if (!syncRes.ok) {
              const syncError = await syncRes.json();
              throw new Error(syncError.message || 'Failed to sync user profile.');
            }

            sessionStorage.removeItem('ez_learn_reg_details');
            setCreatedOrgSlug(details.slug);
            setCreationStatus('success');
            notify.success('Workspace created successfully!');
          } catch (err) {
            const error = err as Error;
            setCreationStatus('error');
            setErrorMessage(error.message || 'An unexpected error occurred during database setup.');
            notify.error('Setup failed', error.message);
          }
        };

        setupWorkspace();
      } else {
        // Safe fallback if refreshed
        setCreationStatus('success');
      }
    }
  }, [isUserLoaded, user, currentStep, creationStatus]);

  // Staggered features list on the right
  const features = [
    { text: 'AI-powered skill assessments', icon: '🤖' },
    { text: 'Personalized learning paths', icon: '🗺️' },
    { text: 'Real-time team analytics', icon: '📊' },
    { text: 'Usage-based pricing', icon: '💡' },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      
      {/* LEFT AREA: Stepper + Form containing (55% width) */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-16 relative z-10">
        
        <div className="max-w-md w-full mx-auto space-y-8">
          {/* Logo header for mobile */}
          <div className="lg:hidden flex justify-center mb-6">
            <Logo size="md" />
          </div>

          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight font-heading bg-gradient-primary bg-clip-text text-transparent">
              Create Your Workspace
            </h1>
            <p className="text-muted-foreground text-sm">
              Construct your company learning hub in minutes
            </p>
          </div>

          {/* Progress Indicators */}
          <StepIndicator currentStep={currentStep} />

          {/* Render Step forms */}
          <Card className="bg-card border-border shadow-2xl glass p-6 rounded-2xl relative overflow-hidden">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleSubmit(onSubmitStep1)}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-xs font-semibold text-muted-foreground">
                      Company Name
                    </Label>
                    <Input
                      id="companyName"
                      placeholder="e.g. Acme Corporation"
                      className="bg-card border-border focus-visible:ring-primary text-foreground"
                      {...register('companyName')}
                    />
                    {errors.companyName && (
                      <p className="text-destructive text-xs mt-1">{errors.companyName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="slug" className="text-xs font-semibold text-muted-foreground">
                      Workspace URL
                    </Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-muted-foreground text-sm select-none">
                        ezlearn.app/
                      </span>
                      <Input
                        id="slug"
                        placeholder="acme-corp"
                        className="pl-[84px] bg-card border-border focus-visible:ring-primary text-foreground"
                        {...register('slug')}
                      />
                    </div>
                    
                    {/* Real-time Slug Status check indicators */}
                    <div className="flex items-center justify-between text-xs mt-1.5 min-h-[16px]">
                      {slugStatus === 'checking' && (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Checking availability...
                        </span>
                      )}
                      {slugStatus === 'available' && (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <Check className="h-3 w-3 text-success" /> URL Available
                        </span>
                      )}
                      {slugStatus === 'taken' && (
                        <span className="text-destructive font-semibold flex items-center gap-1">
                          <X className="h-3 w-3 text-destructive" /> URL is already taken
                        </span>
                      )}
                      {errors.slug && (
                        <span className="text-destructive">{errors.slug.message}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="industry" className="text-xs font-semibold text-muted-foreground">
                        Industry
                      </Label>
                      <select
                        id="industry"
                        className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                        {...register('industry')}
                      >
                        <option value="" disabled className="bg-card">Select...</option>
                        <option value="Technology" className="bg-card">Technology</option>
                        <option value="Finance" className="bg-card">Finance</option>
                        <option value="Healthcare" className="bg-card">Healthcare</option>
                        <option value="Retail" className="bg-card">Retail</option>
                        <option value="Education" className="bg-card">Education</option>
                        <option value="Manufacturing" className="bg-card">Manufacturing</option>
                        <option value="Consulting" className="bg-card">Consulting</option>
                        <option value="Other" className="bg-card">Other</option>
                      </select>
                      {errors.industry && (
                        <p className="text-destructive text-xs mt-1">{errors.industry.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="companySize" className="text-xs font-semibold text-muted-foreground">
                        Company Size
                      </Label>
                      <select
                        id="companySize"
                        className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                        {...register('companySize')}
                      >
                        <option value="" disabled className="bg-card">Select...</option>
                        <option value="1-10" className="bg-card">1-10 employees</option>
                        <option value="11-50" className="bg-card">11-50 employees</option>
                        <option value="51-200" className="bg-card">51-200 employees</option>
                        <option value="201-500" className="bg-card">201-500 employees</option>
                        <option value="500+" className="bg-card">500+ employees</option>
                      </select>
                      {errors.companySize && (
                        <p className="text-destructive text-xs mt-1">{errors.companySize.message}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!isValid || slugStatus !== 'available'}
                    className="w-full mt-4 bg-gradient-primary hover:opacity-90 text-white border-0 shadow-glow-sm transition-opacity"
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </motion.form>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-5 flex flex-col items-center justify-center"
                >
                  <div className="text-center space-y-1 mb-2">
                    <h3 className="font-heading text-sm font-semibold text-foreground">Create Admin Account</h3>
                    <p className="text-muted-foreground text-xs">
                      Set up your secure credentials to manage employees and pathways.
                    </p>
                  </div>
                  
                  {/* Embedded Clerk widget */}
                  <div className="w-full flex justify-center bg-card/40 p-4 rounded-xl border border-border/60">
                    <SignUp
                      routing="hash"
                      signInUrl="/sign-in"
                      fallbackRedirectUrl="/register?step=3"
                      forceRedirectUrl="/register?step=3"
                    />
                  </div>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/register?step=1')}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ← Back to company details
                  </Button>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 space-y-6"
                >
                  {creationStatus === 'creating' && (
                    <div className="space-y-4 py-8 flex flex-col items-center">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Syncing Workspace Configurations</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Setting up databases and indexing search tools...
                        </p>
                      </div>
                    </div>
                  )}

                  {creationStatus === 'error' && (
                    <div className="space-y-4 py-6 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                        <X className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">Setup Encountered an Issue</h4>
                        <p className="text-xs text-destructive mt-1 max-w-xs mx-auto">
                          {errorMessage}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setCreationStatus('idle')}>
                        Retry Setup
                      </Button>
                    </div>
                  )}

                  {creationStatus === 'success' && (
                    <div className="space-y-6">
                      {/* Animated checkmark */}
                      <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto text-success scale-105 shadow-glow-sm">
                        <Check className="h-7 w-7" />
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-foreground font-heading">
                          🎉 Workspace is Ready!
                        </h3>
                        <p className="text-muted-foreground text-xs max-w-sm mx-auto leading-relaxed">
                          Welcome to EZ LEARN. Your enterprise portal is now live and fully indexed.
                        </p>
                        {createdOrgSlug && (
                          <Badge variant="secondary" className="text-[10px] py-1 font-mono tracking-tight bg-muted border border-border text-foreground">
                            ezlearn.app/{createdOrgSlug}
                          </Badge>
                        )}
                      </div>

                      {/* Onboarding steps grid */}
                      <div className="grid grid-cols-1 gap-3 text-left max-w-sm mx-auto">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                          <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                            👥
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">Invite Your Team</div>
                            <div className="text-[10px] text-muted-foreground">Add learners and assign skill modules</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                          <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                            ⚙️
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">Set Up Departments</div>
                            <div className="text-[10px] text-muted-foreground">Structure organizational learning paths</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                          <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                            📊
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">View Analytics</div>
                            <div className="text-[10px] text-muted-foreground">Monitor aggregate skill graphs and passes</div>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => router.push('/manage/dashboard')}
                        className="w-full bg-gradient-primary hover:opacity-90 text-white border-0 shadow-glow-sm transition-opacity"
                      >
                        Go to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </div>

      {/* RIGHT AREA: Features and details containment (45% width) */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-slate-900 to-background border-l border-border relative items-center justify-center px-12 overflow-hidden select-none">
        
        {/* Glowing Orbs */}
        <div className="absolute top-1/4 right-1/4 h-80 w-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 h-80 w-80 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-20" 
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(74, 144, 217, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(74, 144, 217, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 max-w-md space-y-12">
          
          {/* Logo Branding */}
          <div className="space-y-3">
            <Logo size="lg" />
            <p className="text-muted-foreground text-sm font-medium tracking-tight pl-2 border-l border-primary/40">
              AI-powered onboarding & personalized learning paths.
            </p>
          </div>

          {/* Feature List staggered checks */}
          <div className="space-y-4">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx, duration: 0.4 }}
                className="flex items-center gap-3 bg-card border border-border rounded-xl p-3.5 shadow-md card-hover"
              >
                <span className="text-xl shrink-0">{feature.icon}</span>
                <span className="text-xs font-semibold text-foreground">{feature.text}</span>
              </motion.div>
            ))}
          </div>

          {/* Quote testimonial at bottom */}
          <div className="p-5 border border-border rounded-xl bg-card relative">
            <div className="absolute -top-3 left-6 px-2 py-0.5 bg-muted border border-border rounded text-[9px] font-bold text-primary tracking-widest uppercase">
              Case Study
            </div>
            <p className="text-[11px] text-muted-foreground italic leading-relaxed">
              &ldquo;Transitioning our employee onboarding to EZ LEARN helped cut path-generation delay by 70%. The AI curated resource engine maps exact skill dependencies without requiring manual syllabus builds.&rdquo;
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] text-foreground font-bold">
                JD
              </div>
              <div>
                <div className="text-[10px] font-bold text-foreground">John Doe</div>
                <div className="text-[8px] text-muted-foreground">Director of Engineering, TechScale</div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-xs uppercase font-black tracking-widest text-slate-600">Initializing Portal</span>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}
