import React, { useState } from 'react';
import { X, ArrowRight, KeyRound } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

const PASSWORD_MIN_LENGTH = 12;
const passwordIsStrong = (value: string) =>
  value.length >= PASSWORD_MIN_LENGTH &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z0-9]/.test(value);

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, authModalMode, setAuthModalMode, showToast } = useData();
  const { signIn, signUp, resetPassword, appDataMode } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAuthModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || appDataMode !== 'supabase') return;

    setBusy(true);
    try {
      if (authModalMode === 'forgot') {
        const res = await resetPassword(email.trim());
        if (res.ok) {
          showToast('Password reset link sent to your email!', '📧', 'success');
          setAuthModalMode('login');
        } else showToast(res.error ?? 'Could not send the reset link', '⚠️', 'info');
        return;
      }

      if (authModalMode === 'login') {
        if (!email.trim() || password.length < 1) return;
        const res = await signIn(email.trim(), password);
        if (res.ok) {
          showToast(`Welcome back, ${email.trim().split('@')[0]}!`, '⚡', 'success');
          setIsAuthModalOpen(false);
        } else showToast(res.error ?? 'Sign in failed', '⚠️', 'info');
        return;
      }

      if (!name.trim() || !username.trim() || !email.trim()) return;
      if (!passwordIsStrong(password)) {
        showToast('Use a 12+ character password with uppercase, lowercase, a number, and a symbol.', '🔐', 'info');
        return;
      }

      const res = await signUp(name.trim(), username.trim(), email.trim(), password);
      if (res.ok) {
        showToast(
          res.needsEmailConfirmation ? 'Account created — check your email to confirm!' : `Welcome to VYBE, ${name.trim()}!`,
          '🎉',
          'success'
        );
        setIsAuthModalOpen(false);
      } else showToast(res.error ?? 'Sign up failed', '⚠️', 'info');
    } finally {
      setBusy(false);
    }
  };

  const headerTitle = authModalMode === 'login' ? 'Welcome to VYBE' : authModalMode === 'register' ? 'Join the VYBE Club' : 'Reset your password';
  const headerSub = authModalMode === 'login'
    ? 'Sign in to save places, build plans & drop reviews'
    : authModalMode === 'register'
      ? 'Create a real profile and share your discoveries'
      : 'Enter your email and we’ll send a reset link';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn cursor-pointer" data-testid="auth-modal" onClick={() => setIsAuthModalOpen(false)}>
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-2xl p-6 sm:p-8 space-y-6 cursor-default" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white bg-slate-100 dark:bg-vybe-dark-surface transition-colors" aria-label="Close authentication dialog"><X className="w-4 h-4" /></button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-black dark:bg-white text-vybe-lime dark:text-black font-black text-2xl flex items-center justify-center shadow-neon-lime">V</div>
          <h3 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">{headerTitle}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">{headerSub}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalMode === 'register' && (
            <>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Your Full Name</label><input type="text" required maxLength={120} placeholder="e.g. Alex Rivera" value={name} onChange={e => setName(e.target.value)} autoComplete="name" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Username</label><input type="text" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" placeholder="e.g. alex_vybes" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none" /></div>
            </>
          )}

          <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label><input type="email" required maxLength={254} placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none" /></div>

          {authModalMode !== 'forgot' && (
            <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</label><input type="password" required minLength={authModalMode === 'register' ? PASSWORD_MIN_LENGTH : 1} data-testid="auth-password" placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete={authModalMode === 'login' ? 'current-password' : 'new-password'} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none" />
              {authModalMode === 'register' && <p className="text-[11px] text-slate-500 dark:text-slate-400">12+ chars, with uppercase, lowercase, number and symbol.</p>}
            </div>
          )}

          <button type="submit" disabled={busy} className="w-full py-3.5 rounded-2xl bg-vybe-lime text-black font-display font-extrabold text-xs uppercase tracking-wider shadow-neon-lime hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:scale-100">
            <span>{authModalMode === 'login' ? 'Sign In & Discover' : authModalMode === 'register' ? 'Create Account' : 'Send Reset Link'}</span>
            {authModalMode === 'forgot' ? <KeyRound className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
          {authModalMode === 'forgot' ? (
            <p>Remembered it? <button type="button" onClick={() => setAuthModalMode('login')} className="text-vybe-lime font-bold hover:underline">Back to sign in</button></p>
          ) : authModalMode === 'login' ? (
            <><p>Don’t have an account? <button type="button" onClick={() => setAuthModalMode('register')} className="text-vybe-lime font-bold hover:underline">Sign up free</button></p><p><button type="button" onClick={() => setAuthModalMode('forgot')} className="text-slate-400 hover:text-vybe-lime font-semibold hover:underline inline-flex items-center gap-1"><KeyRound className="w-3 h-3" />Forgot your password?</button></p></>
          ) : (
            <p>Already have an account? <button type="button" onClick={() => setAuthModalMode('login')} className="text-vybe-lime font-bold hover:underline">Log in</button></p>
          )}
        </div>
      </div>
    </div>
  );
};
