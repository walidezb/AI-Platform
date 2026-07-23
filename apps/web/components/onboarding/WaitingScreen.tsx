'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, BookOpen, Clock } from 'lucide-react';
import { AnimatedBackground } from './AnimatedBackground';
import { OnboardingSteps } from './OnboardingSteps';
import { NeuralNetworkAnimation } from './NeuralNetworkAnimation';
import { GenerationSteps } from './GenerationSteps';
import { formatElapsed } from '@/lib/utils/date';
import { Button } from '@/components/ui/button';

interface PathData {
  id: string;
  title: string;
  totalMilestones: number;
  estimatedHours: number;
}

interface WaitingScreenProps {
  token: string;
  userId: string;
  employeeName: string;
  orgName: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const MAX_POLL_ATTEMPTS = 120; // 120 x 5s = 10 minutes max

export function WaitingScreen({ token, userId }: WaitingScreenProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'ASSESSING' | 'GENERATING' | 'READY' | 'TIMEOUT'>('GENERATING');
  const [pathData, setPathData] = useState<PathData | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [dots, setDots] = useState('.');

  // Polling logic
  useEffect(() => {
    if (status === 'TIMEOUT' || status === 'READY') return;

    let pollAttempts = attempts;

    const poll = async () => {
      pollAttempts++;
      setAttempts(pollAttempts);

      if (pollAttempts >= MAX_POLL_ATTEMPTS) {
        setStatus('TIMEOUT');
        return;
      }

      try {
        const res = await fetch(`/api/path-status/${userId}?token=${token}`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (data.pathReady && data.path) {
          setStatus('READY');
          setPathData(data.path);
          setTimeout(() => {
            router.push(`/onboarding/${token}/welcome-to-path`);
          }, 2500);
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    };

    poll(); // immediate trigger
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [userId, token, router, status, attempts]);

  // Seconds counter timer
  useEffect(() => {
    if (status === 'TIMEOUT') return;
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Dots indicator text timer
  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '.' : d + '.'));
    }, 500);
    return () => clearInterval(dotTimer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 relative overflow-hidden text-slate-100">
      <AnimatedBackground />

      <div className="max-w-lg w-full text-center z-10 space-y-8">
        {/* STEP INDICATOR */}
        <OnboardingSteps currentStep={status === 'READY' ? 2 : 1} />

        {/* MAIN CONTENT — changes based on status */}
        <AnimatePresence mode="wait">
          {status === 'GENERATING' && (
            <motion.div
              key="generating"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <NeuralNetworkAnimation />

              <h1 className="font-heading text-3xl font-bold text-white tracking-tight mt-6">
                Building Your Learning Path{dots}
              </h1>
              <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                Our AI is analyzing your responses and curating the perfect curriculum for your goals
              </p>

              {/* Generation steps Checklist */}
              <GenerationSteps elapsedSeconds={elapsedSeconds} />

              {/* Elapsed timing tracker */}
              <p className="text-xs text-slate-500 mt-6 tracking-wide">
                ⏱ {formatElapsed(elapsedSeconds)} elapsed ({attempts} check{attempts !== 1 ? 's' : ''})
              </p>
            </motion.div>
          )}

          {status === 'TIMEOUT' && (
            <motion.div
              key="timeout"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 mt-4 text-center animate-in fade-in"
            >
              <div className="rounded-full bg-amber-500/10 p-4 border border-amber-500/20">
                <Clock className="h-8 w-8 text-amber-400" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-white">
                  Still Working on It...
                </h3>
                <p className="mt-2 text-sm text-slate-400 max-w-sm leading-relaxed">
                  Your personalized learning path is taking a bit longer than usual. We&apos;ll notify your email as soon as it&apos;s ready!
                </p>
              </div>
              <div className="flex gap-3 mt-2">
                <Button
                  variant="outline"
                  className="bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 text-xs font-semibold"
                  onClick={() => router.push('/learn/dashboard')}
                >
                  Go to Dashboard
                </Button>
                <Button
                  className="bg-gradient-primary text-white text-xs font-bold"
                  onClick={() => {
                    setAttempts(0);
                    setStatus('GENERATING');
                  }}
                >
                  Keep Waiting
                </Button>
              </div>
            </motion.div>
          )}

          {status === 'READY' && pathData && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="space-y-6"
            >
              {/* Success Concentric Rings */}
              <div className="relative mx-auto h-24 w-24 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="relative h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-emerald-400" />
                </div>
              </div>

              <h1 className="font-heading text-3xl font-bold text-white mb-2">
                Your Path is Ready! 🎉
              </h1>
              <p className="text-sm text-slate-400 mb-6">
                Redirecting you to your personalized learning path...
              </p>

              {/* Path preview card */}
              <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-6 text-left max-w-md mx-auto shadow-2xl backdrop-blur-md">
                <p className="text-[10px] text-indigo-400 uppercase font-semibold tracking-wider mb-2">
                  Generated Curriculum
                </p>
                <p className="font-semibold text-lg text-slate-100">{pathData.title}</p>
                <div className="flex gap-6 mt-4 text-xs text-slate-400 border-t border-slate-800/60 pt-4">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-200 font-medium">{pathData.totalMilestones}</span> milestones
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-500" />
                    ~<span className="text-slate-200 font-medium">{pathData.estimatedHours}</span>h total
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
