import React from 'react';
import { Sparkles, Flame } from 'lucide-react';

interface VybeScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const VybeScoreBadge: React.FC<VybeScoreBadgeProps> = ({
  score,
  size = 'md',
  showLabel = false,
  className = ''
}) => {
  const isTopMatch = score >= 95;
  const isHighMatch = score >= 90;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-bold px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-extrabold px-3 py-1.5 gap-2'
  };

  const getStyle = () => {
    if (isTopMatch) {
      return 'bg-black text-vybe-lime border border-vybe-lime/60 shadow-[0_0_12px_rgba(204,255,0,0.4)] dark:bg-vybe-dark-card';
    }
    if (isHighMatch) {
      return 'bg-black text-vybe-cyan border border-vybe-cyan/60 shadow-[0_0_12px_rgba(0,240,255,0.4)] dark:bg-vybe-dark-card';
    }
    return 'bg-black text-vybe-yellow border border-vybe-yellow/40 dark:bg-vybe-dark-card';
  };

  return (
    <div
      className={`inline-flex items-center rounded-full font-mono uppercase tracking-wider backdrop-blur-md transition-transform hover:scale-105 ${sizeClasses[size]} ${getStyle()} ${className}`}
      title={`VYBE Score: ${score}% match`}
    >
      {isTopMatch ? (
        <Flame className="w-3.5 h-3.5 animate-pulse text-vybe-citrus fill-vybe-citrus" />
      ) : (
        <Sparkles className="w-3 h-3 text-vybe-cyan fill-vybe-cyan" />
      )}
      <span>{score} <span className="text-[10px] opacity-75 font-sans">VYBE</span></span>
      {showLabel && (
        <span className="hidden sm:inline text-[10px] font-sans font-medium text-slate-300 border-l border-white/20 pl-1.5">
          {score >= 95 ? 'Epic Vibe' : 'Top Pick'}
        </span>
      )}
    </div>
  );
};

