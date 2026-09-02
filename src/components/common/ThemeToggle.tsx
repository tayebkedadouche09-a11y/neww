import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2.5 rounded-full transition-all duration-300 border ${
        theme === 'dark'
          ? 'bg-vybe-dark-surface border-vybe-dark-border text-yellow-300 hover:bg-vybe-dark-surface/80 hover:border-yellow-400/40 hover:shadow-neon-yellow'
          : 'bg-white border-slate-200 text-indigo-900 hover:bg-slate-50 hover:border-indigo-300 shadow-sm'
      } ${className}`}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
      aria-label="Toggle theme"
      data-cursor="THEME"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 transition-transform duration-300 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-5 h-5 transition-transform duration-300 -rotate-12 hover:rotate-0" />
        )}
      </div>
    </button>
  );
};

