'use client';

import React, { useEffect, useState } from 'react';

type Props = {
  score: number; // 0–100
  size?: number; // px, default 140
  passing: number; // passing score threshold
};

export function ScoreDisplay({ score, size = 140, passing }: Props) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const [displayed, setDisplayed] = useState(0);

  // Animate number count-up
  useEffect(() => {
    const duration = 1200;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = Math.min((now - start) / duration, 1);
      // Ease-out
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setDisplayed(Math.round(eased * score));
      if (elapsed < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score]);

  // Color thresholds
  const color =
    score >= 80
      ? '#34d399' // emerald
      : score >= passing
        ? '#fbbf24' // amber
        : '#f87171'; // rose

  const strokeOffset = circumference - (displayed / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={10}
          className="text-secondary"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {displayed}%
        </span>
        <span className="text-xs text-muted-foreground">score</span>
      </div>
    </div>
  );
}
