'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedBackground } from '@/components/onboarding/AnimatedBackground';
import { OnboardingSteps } from '@/components/onboarding/OnboardingSteps';
import { Button } from '@/components/ui/button';

export default function WelcomeToPathPage(props: { params: Promise<{ token: string }> }) {
  const { token } = React.use(props.params);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden text-slate-100">
      <AnimatedBackground />
      <div className="text-center z-10 max-w-md w-full px-4 space-y-8">
        <OnboardingSteps currentStep={3} />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl space-y-6"
        >
          <div className="text-6xl animate-bounce">🎓</div>
          
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-bold text-white tracking-tight">
              Your Path Awaits!
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Create your account to start your learning journey and track your progress
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <Button
              className="w-full h-12 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-lg text-white font-medium text-sm rounded-xl transition-all duration-200"
              size="lg"
              onClick={() => window.location.href = `/sign-up?token=${token}`}
            >
              Create Your Account →
            </Button>
            <p className="text-[10px] text-slate-500 tracking-wider">
              Free to start · No credit card required
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
