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

interface PathData {
  id: string;
  title: string;
  totalMilestones: number;
  estimatedHours: number;
}

interface AssessmentData {
  identifiedRole: string | null;
  experienceLevel: string | null;
}

interface WaitingScreenProps {
  token: string;
  userId: string;
  employeeName: string;
  orgName: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export function WaitingScreen({ token, userId }: WaitingScreenProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'ASSESSING' | 'GENERATING' | 'READY'>('GENERATING');
  const [pathData, setPathData] = useState<PathData | null>(null);
  const [_assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [dots, setDots] = useState('.');

  // Polling logic
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/path-status/${userId}?token=${token}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        
        setStatus(data.status);
        if (data.assessment) {
          setAssessmentData(data.assessment);
        }

        if (data.pathReady && data.path) {
          setPathData(data.path);
          // Auto-redirect after 2.5s so they see the success card
          setTimeout(() => {
            router.push(`/onboarding/${token}/welcome-to-path`);
          }, 2500);
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    };

    poll(); // immediate trigger
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [userId, token, router]);

  // Seconds counter timer
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

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
                ⏱ {formatElapsed(elapsedSeconds)} elapsed · Usually takes ~30 seconds
              </p>
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
