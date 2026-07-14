'use client';

import React from 'react';

export function AnimatedBackground() {
  const gridPattern = 'linear-gradient(rgba(26, 36, 51, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(26, 36, 51, 0.03) 1px, transparent 1px)';

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#F0F5FB]">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(30px, -40px) scale(1.05); }
          66%  { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(-40px, 30px) scale(1.08); }
          66%  { transform: translate(20px, -20px) scale(0.92); }
        }
        .animate-orb-float-1 {
          animation: orbFloat1 20s ease-in-out infinite;
        }
        .animate-orb-float-2 {
          animation: orbFloat2 25s ease-in-out infinite;
        }
      `}} />

      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-80" 
        style={{ 
          backgroundImage: gridPattern,
          backgroundSize: '48px 48px'
        }} 
      />

      {/* Floating Orbs */}
      <div 
        className="animate-orb-float-1 absolute -top-32 -left-32 rounded-full blur-3xl w-[300px] h-[300px] md:w-[600px] md:h-[600px] pointer-events-none"
        style={{ 
          background: 'radial-gradient(circle, rgba(74, 144, 217, 0.1) 0%, transparent 70%)'
        }} 
      />
      <div 
        className="animate-orb-float-2 absolute -bottom-32 -right-32 rounded-full blur-3xl w-[250px] h-[250px] md:w-[500px] md:h-[500px] pointer-events-none"
        style={{ 
          background: 'radial-gradient(circle, rgba(52, 201, 176, 0.08) 0%, transparent 70%)'
        }} 
      />

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#F0F5FB] to-transparent pointer-events-none" />
    </div>
  );
}
