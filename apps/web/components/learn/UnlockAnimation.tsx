'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Unlock } from 'lucide-react';

type Props = {
  isLocked: boolean;
  children: ReactNode;
  onUnlock?: () => void;
};

export function UnlockAnimation({ isLocked, children, onUnlock }: Props) {
  const [wasLocked, setWasLocked] = useState(isLocked);
  const [isAnimating, setAnimating] = useState(false);

  useEffect(() => {
    // Detect transition from locked → unlocked
    if (wasLocked && !isLocked) {
      setAnimating(true);
      onUnlock?.();
      setTimeout(() => {
        setAnimating(false);
        setWasLocked(false);
      }, 800);
    } else {
      setWasLocked(isLocked);
    }
  }, [isLocked, wasLocked, onUnlock]);

  return (
    <div className="relative">
      {/* Unlock flash overlay */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, times: [0, 0.3, 1] }}
            className="absolute inset-0 z-10 rounded-xl bg-primary/20 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          opacity: isLocked ? 0.5 : 1,
          scale: isAnimating ? [1, 1.02, 1] : 1,
          filter: isLocked ? 'grayscale(30%)' : 'grayscale(0%)',
        }}
        transition={{ duration: 0.4 }}
      >
        {children}
      </motion.div>

      {/* Spinning lock icon that disappears on unlock */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            initial={{ opacity: 1, scale: 1, rotate: 0 }}
            animate={{ opacity: 0, scale: 0, rotate: 180 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute top-4 right-4 z-20"
          >
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Unlock className="h-4 w-4 text-primary" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
