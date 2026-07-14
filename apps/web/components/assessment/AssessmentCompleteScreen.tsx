'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, TrendingUp, Target, Sparkles } from 'lucide-react';
import { AnimatedBackground } from '../onboarding/AnimatedBackground';
import { ExperienceLevelBadge } from '../ui/ExperienceLevelBadge';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { formatDate } from '@/lib/utils/date';

interface AssessmentData {
  identifiedRole: string;
  experienceLevel: string;
  strongAreas: string[];
  weakAreas: string[];
  learningGoals: string[];
  completedAt: string;
}

interface AssessmentCompleteScreenProps {
  token: string;
  employeeName: string;
  orgName: string;
  assessment: AssessmentData;
}

export function AssessmentCompleteScreen({
  token,
  employeeName,
  orgName,
  assessment,
}: AssessmentCompleteScreenProps) {
  const router = useRouter();
  const firstName = employeeName ? employeeName.split(' ')[0] : 'there';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden text-slate-100">
      <AnimatedBackground />

      <div className="max-w-xl w-full z-10 space-y-6">
        {/* ── 1. CELEBRATION HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {/* Animated trophy */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="text-7xl mb-4 select-none"
          >
            🎯
          </motion.div>
          <h1 className="font-heading text-3xl font-bold mb-2 text-white">
            Assessment Complete!
          </h1>
          <p className="text-slate-400">
            Here&apos;s what our AI discovered about your skills,{' '}
            <span className="text-white font-medium">
              {firstName}
            </span>
          </p>
        </motion.div>

        {/* ── 2. SKILL PROFILE CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md p-6 space-y-5">
            {/* Role + Level */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Identified Role</p>
                <p className="font-semibold text-lg text-white">
                  {assessment.identifiedRole}
                </p>
              </div>
              <ExperienceLevelBadge level={assessment.experienceLevel} />
            </div>

            <Separator className="bg-slate-800" />

            {/* Strengths */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-medium">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                Your Strengths
              </p>
              <div className="flex flex-wrap gap-2">
                {assessment.strongAreas.map((area) => (
                  <span
                    key={area}
                    className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Growth Areas */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-medium">
                <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                Growth Areas
              </p>
              <div className="flex flex-wrap gap-2">
                {assessment.weakAreas.map((area) => (
                  <span
                    key={area}
                    className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Learning Goals */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-medium">
                <Target className="h-3.5 w-3.5 text-indigo-400" />
                Your Goals
              </p>
              <ul className="space-y-1.5">
                {assessment.learningGoals.map((goal, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">→</span>
                    {goal}
                  </li>
                ))}
              </ul>
            </div>

            {/* Completed timestamp */}
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-500 text-center">
                ✅ Completed {formatDate(assessment.completedAt)} · {orgName}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* ── 3. WHAT HAPPENS NEXT ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-slate-900/30 border border-slate-800/40 p-4 rounded-xl backdrop-blur-xs"
        >
          <p className="text-sm font-medium mb-3 flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            What happens next
          </p>
          <div className="space-y-2 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                1
              </div>
              AI is building your personalized learning path right now
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                2
              </div>
              Create your account to access your path and track progress
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                3
              </div>
              Start learning at your own pace, milestone by milestone
            </div>
          </div>
        </motion.div>

        {/* ── 4. CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col gap-3"
        >
          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-lg text-white font-medium rounded-xl transition-all duration-200"
            onClick={() => router.push(`/onboarding/${token}/path-ready`)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            View My Learning Path →
          </Button>
          <p className="text-center text-xs text-slate-500">
            Your path is being prepared · Usually ready in ~30 seconds
          </p>
        </motion.div>
      </div>
    </div>
  );
}
export default AssessmentCompleteScreen;
