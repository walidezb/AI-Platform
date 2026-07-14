'use client';

import React from 'react';
import { Brain } from 'lucide-react';

export function NeuralNetworkAnimation() {
  return (
    <div className="relative h-32 w-32 mx-auto mb-4 flex items-center justify-center">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full border border-indigo-500/30 animate-ping"
          style={{
            animationDuration: '2.5s',
            animationDelay: `${i * 0.5}s`,
            opacity: 1 - i * 0.3,
          }}
        />
      ))}
      <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 z-10">
        <Brain className="h-8 w-8 text-white animate-pulse" />
      </div>
    </div>
  );
}
