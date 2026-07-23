'use client';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ResumeButtonProps {
  redirectUrl: string;
  moduleTitle?: string;
  moduleType?: string;
  className?: string;
}

export function ResumeButton({
  redirectUrl,
  moduleTitle,
  moduleType,
  className,
}: ResumeButtonProps) {
  return (
    <motion.div
      className={cn(
        'relative rounded-2xl overflow-hidden p-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 bg-[length:200%_100%] animate-[gradientShift_3s_linear_infinite]',
        className,
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Link
        href={redirectUrl}
        className="relative flex items-center gap-4 rounded-[14px] bg-slate-900 px-6 py-5 hover:bg-slate-900/80 transition-colors group"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
          <BookOpen className="h-5 w-5 text-indigo-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Pick up where you left off
          </p>
          <p className="font-semibold truncate text-slate-100 mt-0.5">
            {moduleTitle ? `Continue: ${moduleTitle}` : 'Continue Learning'}
          </p>
          {moduleType && (
            <p className="text-xs text-slate-400 mt-0.5">{moduleType}</p>
          )}
        </div>

        <ArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0 group-hover:text-slate-100 group-hover:translate-x-1 transition-all duration-200" />
      </Link>
    </motion.div>
  );
}
