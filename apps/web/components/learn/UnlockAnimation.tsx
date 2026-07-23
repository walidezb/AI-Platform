'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Unlock } from 'lucide-react';

type Props = {
  isLocked?: boolean;
  isJustUnlocked?: boolean;
  children: ReactNode;
  onUnlock?: () => void;
};

export function UnlockAnimation({
  isLocked = false,
  isJustUnlocked = false,
  children,
  onUnlock,
}: Props) {
  const [wasLocked, setWasLocked] = useState(isLocked);
  const [isAnimating, setAnimating] = useState(isJustUnlocked);

  useEffect(() => {
    if (isJustUnlocked) {
      setAnimating(true);
      onUnlock?.();
      const timer = setTimeout(() => setAnimating(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isJustUnlocked, onUnlock]);

  useEffect(() => {
    if (wasLocked && !isLocked) {
      setAnimating(true);
      onUnlock?.();
      const timer = setTimeout(() => {
        setAnimating(false);
        setWasLocked(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setWasLocked(isLocked);
    }
  }, [isLocked, wasLocked, onUnlock]);

  return (
    <div className="relative">
      <AnimatePresence>
        {(isAnimating || isJustUnlocked) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, times: [0, 0.3, 1] }}
            className="absolute inset-0 z-10 rounded-xl bg-indigo-500/20 border border-indigo-500/50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          opacity: isLocked ? 0.5 : 1,
          scale: isAnimating || isJustUnlocked ? [1, 1.02, 1] : 1,
          filter: isLocked ? 'grayscale(30%)' : 'grayscale(0%)',
        }}
        transition={{ duration: 0.4 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
