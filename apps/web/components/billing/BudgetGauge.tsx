'use client';

import React, { useState, useEffect } from 'react';

type Props = {
  percentUsed: number; // 0–100+ (can exceed 100)
  tokensUsed: number;
  budget: number;
  costUsd: number;
};

export function BudgetGauge({
  percentUsed,
  tokensUsed,
  budget,
  costUsd,
}: Props) {
  const R = 70; // radius
  const cx = 90; // center x
  const cy = 90; // center y
  const stroke = 12; // track width
  const circumf = 2 * Math.PI * R;
  const clamped = Math.min(percentUsed, 100);
  const dashOffset = circumf * (1 - clamped / 100);

  // Color by usage level
  const color =
    percentUsed >= 100
      ? '#ef4444' // red
      : percentUsed >= 80
      ? '#f59e0b' // amber
      : '#34d399'; // emerald

  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * percentUsed));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [percentUsed]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* SVG Gauge */}
      <div className="relative">
        <svg width={180} height={180} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          {/* Colored progress arc */}
          <circle
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumf}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>
        {/* Center text — rotated back upright */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color }}
          >
            {displayed}%
          </span>
          <span className="text-xs text-muted-foreground mt-0.5">
            of budget
          </span>
        </div>
      </div>

      {/* Stats below gauge */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-center">
        <div>
          <p className="text-sm font-bold tabular-nums text-slate-100">
            {(tokensUsed / 1000).toFixed(0)}K
          </p>
          <p className="text-xs text-muted-foreground">Tokens Used</p>
        </div>
        <div>
          <p className="text-sm font-bold tabular-nums text-slate-100">
            ${costUsd.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">Cost to Date</p>
        </div>
        <div>
          <p className="text-sm font-bold tabular-nums text-slate-100">
            {(budget / 1000).toFixed(0)}K
          </p>
          <p className="text-xs text-muted-foreground">Budget</p>
        </div>
        <div>
          <p
            className="text-sm font-bold tabular-nums"
            style={{ color: percentUsed >= 80 ? color : undefined }}
          >
            {budget - tokensUsed > 0
              ? `${((budget - tokensUsed) / 1000).toFixed(0)}K`
              : 'Exceeded'}
          </p>
          <p className="text-xs text-muted-foreground">Remaining</p>
        </div>
      </div>
    </div>
  );
}
