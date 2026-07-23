'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Building2, Sparkles, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { OnboardingSteps } from './OnboardingSteps';
import { BeginButton } from './BeginButton';
import { LanguageSwitcher } from '../LanguageSwitcher';

interface WelcomeContentProps {
  token: string;
  employeeName: string;
  jobTitle?: string | null;
  department?: string | null;
  orgName: string;
  orgLogo?: string | null;
  isReturning: boolean;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }
};

export function WelcomeContent({
  token,
  employeeName,
  jobTitle,
  department,
  orgName,
  orgLogo,
  isReturning,
}: WelcomeContentProps) {
  const t = useTranslations('onboarding');
  const firstName = employeeName.split(' ')[0] || 'Learner';
  const initials = employeeName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'L';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg mx-auto flex flex-col justify-center items-stretch py-12 px-4 sm:px-0 text-white min-h-screen relative z-10"
    >
      {/* Language Switcher Top */}
      <motion.div variants={itemVariants} className="flex justify-end mb-4">
        <LanguageSwitcher />
      </motion.div>

      {/* 1. Step Indicator */}
      <motion.div variants={itemVariants} className="w-full">
        <OnboardingSteps currentStep={1} />
      </motion.div>

      {/* 2. Logo */}
      <motion.div variants={itemVariants} className="flex justify-center mb-6">
        <div className="flex items-center gap-3">
          {orgLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={orgLogo} 
              alt={orgName} 
              className="h-12 w-12 rounded-xl object-cover border border-slate-800" 
            />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center text-white shadow-glow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
          )}
          <span className="font-heading font-black text-white text-xl tracking-tight">LearnPath AI</span>
        </div>
      </motion.div>

      {/* 3. Welcome Heading & Subtitle */}
      <motion.div variants={itemVariants} className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-black font-heading tracking-tight text-white mb-3">
          {isReturning ? (
            <>
              Welcome back, <span className="bg-gradient-primary bg-clip-text text-transparent">{firstName}!</span> 👋
            </>
          ) : (
            <>
              Welcome, <span className="bg-gradient-primary bg-clip-text text-transparent">{firstName}!</span> ✨
            </>
          )}
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed px-4">
          {isReturning 
            ? 'Your assessment is saved. Pick up right where you left off.' 
            : `${orgName} has set up a personalized learning journey just for you.`
          }
        </p>
      </motion.div>

      {/* 4. Profile Card */}
      <motion.div 
        variants={itemVariants}
        className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-4 border border-slate-900 border-l-2 border-l-primary mb-6 shadow-glow-sm"
      >
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-3">
          Your Profile
        </p>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-lg shrink-0 select-none">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white text-sm truncate">{employeeName}</p>
            <div className="flex flex-wrap gap-y-2 gap-x-3 mt-1">
              {jobTitle && (
                <span className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                  <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
                  {jobTitle}
                </span>
              )}
              {department && (
                <span className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                  <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  {department}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 5. Assessment Steps Roadmap */}
      {isReturning ? (
        <motion.div 
          variants={itemVariants} 
          className="p-5 rounded-2xl bg-slate-900/30 border border-slate-900/80 text-center text-xs font-semibold text-slate-300 mb-6 flex items-center justify-center gap-2 select-none"
        >
          <span>📝</span> Resume where you left off
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-2 mb-6">
          {[
            {
              icon: '🎯',
              title: 'Skills Check',
              desc: "We'll chat about your experience and tools you use",
            },
            {
              icon: '🗺️',
              title: 'Goal Mapping',
              desc: 'Share what you want to learn and your career goals',
            },
            {
              icon: '✨',
              title: 'Path Generation',
              desc: 'AI instantly builds your personalized curriculum',
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/30 border border-slate-900/60"
            >
              <span className="text-lg shrink-0 mt-0.5 select-none">{item.icon}</span>
              <div>
                <p className="text-xs font-bold text-white leading-normal">{item.title}</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* 6. Estimated Duration */}
      <motion.div 
        variants={itemVariants}
        className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-6 font-medium select-none"
      >
        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
        <span>{t('estimatedTime')}</span>
      </motion.div>

      {/* 7. Action CTA Button */}
      <motion.div variants={itemVariants} className="w-full mb-4">
        <BeginButton token={token} isReturning={isReturning} />
      </motion.div>

      {/* 8. Footer confidentiality note */}
      <motion.p 
        variants={itemVariants}
        className="text-[10px] text-center text-slate-600 tracking-wide select-none leading-relaxed px-6"
      >
        Confidential · Your answers help us personalize your learning experience
      </motion.p>
    </motion.div>
  );
}
