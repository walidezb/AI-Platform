import React from 'react';
import { Card } from '@/components/ui/card';
import { AnimatedBackground } from '@/components/onboarding/AnimatedBackground';
import { WelcomeContent } from '@/components/onboarding/WelcomeContent';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  // Don't expose token in title
  return {
    title: 'Your Learning Journey | LearnPath AI',
    description: 'Begin your personalized AI-powered learning assessment',
    robots: { index: false, follow: false }, // don't index personal invite pages
    openGraph: {
      title: 'LearnPath AI — Personalized Learning',
      description: 'AI-powered learning paths for modern professionals',
    }
  };
}

export default async function OnboardingLandingPage({ params }: PageProps) {
  const { token } = await params;

  let validation;
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    const res = await fetch(`${apiUrl}/invitations/validate/${token}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      validation = { valid: false, reason: 'Failed to connect to authorization servers.' };
    } else {
      const payload = await res.json();
      validation = payload.data || { valid: false, reason: 'No validation payload returned.' };
    }
  } catch (err) {
    console.error(err);
    validation = { valid: false, reason: 'Server connection timed out. Please try again.' };
  }

  // Render invalid state
  if (!validation.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090912] px-4">
        <AnimatedBackground />
        <Card className="max-w-md w-full p-8 text-center bg-slate-950/60 border-slate-900 backdrop-blur-md shadow-2xl">
          <div className="text-5xl mb-4 select-none animate-bounce">😕</div>
          <h1 className="text-xl font-heading font-bold text-white tracking-tight">
            Invitation Expired or Invalid
          </h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {validation.reason || 'This onboarding session identifier is expired or is no longer valid.'}
          </p>
          <div className="h-px bg-slate-800/60 my-5" />
          <p className="text-[11px] text-slate-500">
            Please contact your organization coordinator or manager to request a new invitation link.
          </p>
        </Card>
      </div>
    );
  }

  const {
    employeeName,
    jobTitle,
    department,
    orgName,
    orgLogo,
    isReturning,
  } = validation;

  return (
    <>
      <AnimatedBackground />
      <WelcomeContent
        token={token}
        employeeName={employeeName}
        jobTitle={jobTitle}
        department={department}
        orgName={orgName}
        orgLogo={orgLogo}
        isReturning={isReturning}
      />
    </>
  );
}
