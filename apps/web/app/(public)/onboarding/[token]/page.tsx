import React from 'react';
import { Sparkles, Briefcase, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { OnboardingSteps } from '@/components/onboarding/OnboardingSteps';
import { BeginButton } from '@/components/onboarding/BeginButton';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <Card className="max-w-md w-full p-8 text-center bg-slate-900/60 border-slate-800/80 backdrop-blur-md shadow-2xl">
          <div className="text-5xl mb-4 select-none animate-bounce">😕</div>
          <h1 className="text-xl font-heading font-bold text-white tracking-tight">
            Invitation Expired or Invalid
          </h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {validation.reason || 'This onboarding session identifier is expired or is no longer valid.'}
          </p>
          <div className="h-px bg-slate-800 my-5" />
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
    <div className="min-h-screen animated-bg flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animated-bg {
          background: linear-gradient(-45deg, #070914, #0b1120, #08121f, #080913);
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
        }
        .animate-fade {
          animation: fadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scale {
          animation: scaleIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* Floating ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl" />

      {/* Welcome Card Container */}
      <Card className="max-w-lg w-full bg-slate-950/40 border-slate-900 backdrop-blur-lg shadow-glow-lg p-6 sm:p-8 flex flex-col items-center relative z-10">
        
        {/* Company / App Logo */}
        <div className="flex items-center gap-2 mb-6 animate-fade" style={{ animationDelay: '0ms' }}>
          {orgLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={orgLogo} alt={orgName} className="h-10 w-10 rounded-lg object-cover border border-slate-800" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center text-white">
              <Sparkles className="h-5 w-5" />
            </div>
          )}
          <span className="font-heading font-black text-white text-lg tracking-tight">LearnPath AI</span>
        </div>

        {/* Greeting Heading */}
        <div className="text-center animate-fade" style={{ animationDelay: '200ms' }}>
          <h1 className="text-2xl font-bold font-heading text-white tracking-tight">
            {isReturning ? `Welcome back, ${employeeName}! 👋` : `Welcome, ${employeeName}! 👋`}
          </h1>
          <p className="text-xs text-slate-400 mt-2 px-2 max-w-sm mx-auto leading-relaxed">
            {orgName} has invited you to begin your personalized AI learning journey.
          </p>
        </div>

        {/* Target Role Card */}
        {(jobTitle || department) && (
          <div 
            className="w-full bg-slate-900/30 border border-slate-900 rounded-xl p-4 mt-6 flex items-center gap-3 animate-fade"
            style={{ animationDelay: '400ms' }}
          >
            <div className="h-9 w-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
              <Briefcase className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Target Position</p>
              <p className="text-xs font-bold text-white mt-0.5 truncate">
                {jobTitle || 'Learner'} {department ? `· ${department}` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Steps Preview Flow */}
        <div 
          className="w-full space-y-4 my-6 py-2 border-t border-b border-slate-900 animate-fade"
          style={{ animationDelay: '600ms' }}
        >
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Onboarding Roadmap</p>
          
          <div className="space-y-3">
            {[
              { title: '① AI Assessment', desc: 'A short 10-minute diagnostic session mapping your strengths.' },
              { title: '② Path Generation', desc: 'AI compiles a tailored path targeted at your target position.' },
              { title: '③ Start Learning', desc: 'Gain immediate access to curated resources and modules.' }
            ].map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">{step.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic CTA Button wrapper */}
        <div className="w-full animate-scale" style={{ animationDelay: '800ms' }}>
          <BeginButton token={token} isReturning={isReturning} />
        </div>

        {/* Interactive progress markers at the bottom */}
        <div className="w-full mt-6 pt-4 border-t border-slate-900 animate-fade" style={{ animationDelay: '900ms' }}>
          <OnboardingSteps currentStep={1} />
        </div>

        <p className="text-[10px] text-slate-600 text-center mt-6 tracking-wide select-none">
          By continuing you agree to our Terms of Service & Privacy Policy
        </p>

      </Card>
    </div>
  );
}
