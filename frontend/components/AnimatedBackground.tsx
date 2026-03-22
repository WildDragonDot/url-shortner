'use client';

import { Link2, Link, Zap, ArrowRight } from 'lucide-react';

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Floating Icons - Spread across entire page */}
      <div className="absolute inset-0">
        {/* Top Section */}
        <div className="absolute top-[10%] left-[5%] animate-float-slow">
          <Link2 className="w-8 h-8 text-primary-200/30" />
        </div>
        <div className="absolute top-[20%] right-[10%] animate-float-medium">
          <Link className="w-6 h-6 text-primary-300/25" />
        </div>
        <div className="absolute top-[15%] left-[30%] animate-float-fast">
          <Zap className="w-7 h-7 text-primary-300/30" />
        </div>
        <div className="absolute top-[25%] right-[25%] animate-float-slow">
          <Link2 className="w-9 h-9 text-primary-200/25" />
        </div>
        
        {/* Middle Section */}
        <div className="absolute top-[40%] right-[20%] animate-float-slow">
          <Zap className="w-7 h-7 text-primary-300/30" />
        </div>
        <div className="absolute top-[45%] left-[15%] animate-float-medium">
          <Link2 className="w-10 h-10 text-primary-200/20" />
        </div>
        <div className="absolute top-[50%] right-[35%] animate-float-fast">
          <ArrowRight className="w-8 h-8 text-primary-200/25" />
        </div>
        <div className="absolute top-[55%] left-[40%] animate-float-slow">
          <Link className="w-7 h-7 text-primary-300/25" />
        </div>
        
        {/* Bottom Section */}
        <div className="absolute bottom-[20%] left-[25%] animate-float-medium">
          <ArrowRight className="w-8 h-8 text-primary-200/25" />
        </div>
        <div className="absolute bottom-[30%] right-[15%] animate-float-fast">
          <Link2 className="w-9 h-9 text-primary-300/20" />
        </div>
        <div className="absolute bottom-[15%] left-[10%] animate-float-slow">
          <Link className="w-7 h-7 text-primary-200/30" />
        </div>
        <div className="absolute bottom-[25%] right-[30%] animate-float-medium">
          <Zap className="w-6 h-6 text-primary-300/25" />
        </div>
        <div className="absolute bottom-[35%] left-[35%] animate-float-fast">
          <Link2 className="w-8 h-8 text-primary-200/25" />
        </div>

        {/* Animated Lines */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
              <stop offset="50%" stopColor="rgb(59, 130, 246)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Animated connecting lines */}
          <line x1="10%" y1="15%" x2="90%" y2="25%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-dash" />
          <line x1="20%" y1="70%" x2="80%" y2="40%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-dash-slow" />
          <line x1="30%" y1="30%" x2="70%" y2="80%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-dash-fast" />
        </svg>

        {/* Floating Dots - Spread across page */}
        <div className="absolute top-[15%] left-[20%] w-2 h-2 bg-primary-400/30 rounded-full animate-pulse-slow"></div>
        <div className="absolute top-[35%] right-[25%] w-3 h-3 bg-primary-500/25 rounded-full animate-pulse-medium"></div>
        <div className="absolute top-[50%] left-[40%] w-2 h-2 bg-primary-400/30 rounded-full animate-pulse-fast"></div>
        <div className="absolute top-[65%] right-[35%] w-2 h-2 bg-primary-500/20 rounded-full animate-pulse-slow"></div>
        <div className="absolute top-[45%] left-[60%] w-3 h-3 bg-primary-400/25 rounded-full animate-pulse-medium"></div>
        <div className="absolute bottom-[25%] left-[40%] w-2 h-2 bg-primary-400/30 rounded-full animate-pulse-fast"></div>
        <div className="absolute bottom-[40%] right-[20%] w-3 h-3 bg-primary-500/25 rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-[15%] left-[15%] w-2 h-2 bg-primary-400/30 rounded-full animate-pulse-medium"></div>
      </div>
    </div>
  );
}
