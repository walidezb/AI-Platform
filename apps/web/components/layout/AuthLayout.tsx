import React from 'react';
import { Logo } from '../ui/Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 overflow-hidden select-none">
      {/* Animated Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-30" 
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(99, 102, 241, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

      {/* Centered Glass Card */}
      <div className="relative w-full max-w-md rounded-2xl glass p-8 border border-slate-800 shadow-2xl flex flex-col items-center">
        {/* Logo */}
        <Logo size="lg" className="mb-3" />
        {/* Tagline */}
        <p className="text-muted-foreground text-xs font-medium tracking-tight mb-8">
          AI-powered learning for modern teams
        </p>

        {/* Content Children */}
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
