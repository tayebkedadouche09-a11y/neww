import React from 'react';
import { useData } from '../../context/DataContext';
import { X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useData();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/90 dark:bg-vybe-dark-card/95 backdrop-blur-xl border border-white/15 dark:border-vybe-lime/30 text-white shadow-2xl transition-all animate-bounce-subtle"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{toast.emoji || '⚡'}</span>
            <p className="text-sm font-medium text-slate-100">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

