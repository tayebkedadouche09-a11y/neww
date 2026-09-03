import React, { useState } from 'react';
import { X, Sparkles, ArrowRight, KeyRound, User as UserIcon } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, authModalMode, setAuthModalMode, showToast } = useData();
  const { login, register, enterDemoMode, signIn, signUp, resetPassword, profiles, appDataMode } = useAuth();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const realBackend = appDataMode === 'supabase';

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
    if (busy) return;

    if (authModalMode === 'forgot') {
      setBusy(true);
      const res = await resetPassword(email.trim());
      setBusy(false);
      if (res.ok) {
        showToast('Password reset link sent to your email!', '📧', 'success');
        setAuthModalMode('login');
      } else {
        showToast(res.error ?? 'Could not send the reset link', '⚠️', 'info');
      }
      return;
    }

    if (authModalMode === 'login') {
      if (!email.trim()) return;
      if (realBackend) {
        if (!password) return;
        setBusy(true);
        const res = await signIn(email.trim(), password);
        setBusy(false);
        if (res.ok) {
          showToast(`Welcome back, ${email.trim().split('@')[0]}!`, '⚡', 'success');
          setIsAuthModalOpen(false);
        } else {
          showToast(res.error ?? 'Sign in failed', '⚠️', 'info');
        }
        return;
      }
      const ok = login(email.trim());
      showToast(
        ok ? `Welcome back, ${email.trim().split('@')[0]}!` : 'Account not found — use Demo or create an account.',
        ok ? '⚡' : '⚠️',
        ok ? 'success' : 'info'
      );
      if (ok) setIsAuthModalOpen(false);
      return;
    }

    if (!name.trim() || !username.trim() || !email.trim()) return;
    if (realBackend) {
      if (password.length < 6) {
        showToast('Password must be at least 6 characters.', '⚠️', 'info');
        return;
      }
      setBusy(true);
      const res = await signUp(name.trim(), username.trim(), email.trim(), password);
      setBusy(false);
      if (res.ok) {
        showToast(
          res.needsEmailConfirmation ? 'Account created — check your email to confirm!' : `Welcome to VYBE, ${name.trim()}!`,
          '🎉',
          'success'
        );
        setIsAuthModalOpen(false);
      } else {
        showToast(res.error ?? 'Sign up failed', '⚠️', 'info');
      }
      return;
    }

    register(name.trim(), username.trim(), email.trim());
    showToast(`Welcome to VYBE, ${name.trim()}!`, '🎉', 'success');
    setIsAuthModalOpen(false);
  };

  const handleDemoLogin = (demoEmail: string) => {
    const ok = enterDemoMode(demoEmail);
    if (ok) {
      showToast(`Demo mode: exploring as ${demoEmail.split('@')[0]}!`, '⚡', 'vibe');
      setIsAuthModalOpen(false);
    }
  };

  const handlePrimaryDemo = () => {
    const ok = enterDemoMode();
    if (ok) {
      showToast('Demo mode activated — exploring as Kai!', '⚡', 'vibe');
      setIsAuthModalOpen(false);
    }
  };

  const headerTitle =
    authModalMode === 'login'
      ? 'Welcome to VYBE'
      : authModalMode === 'register'
      ? 'Join the VYBE Club'
      : authModalMode === 'forgot'
      ? 'Reset your password'
      : 'Your VYBE Profile';

  const headerSub =
    authModalMode === 'login'
      ? 'Sign in to save places, build plans & drop reviews'
      : authModalMode === 'register'
      ? 'Create a profile and share your secret discoveries'
      : authModalMode === 'forgot'
      ? 'Enter your email and we’ll send a reset link'
      : 'Manage your persona, likes and saved vibes';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn cursor-pointer" data-testid="auth-modal" onClick={() => setIsAuthModalOpen(false)}>
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-2xl p-6 sm:p-8 space-y-6 cursor-default" onClick={e => e.stopPropagation()}>
        <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white bg-slate-100 dark:bg-vybe-dark-surface transition-colors" aria-label="Close authentication dialog"><X className="w-4 h-4" /></button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-black dark:bg-white text-vybe-lime dark:text-black font-black text-2xl flex items-center justify-center shadow-neon-lime">V</div>
          <h3 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">{headerTitle}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">{headerSub}</p>
        </div>

        {authModalMode !== 'forgot' && (
          <button onClick={handlePrimaryDemo} className="w-full py-3.5 rounded-2xl border border-vybe-lime/50 bg-vybe-lime/10 text-vybe-lime font-display font-extrabold text-xs uppercase tracking-wider hover:bg-vybe-lime hover:text-black hover:shadow-neon-lime transition-all flex items-center justify-center gap-2" data-testid="continue-demo">
            <UserIcon className="w-4 h-4" /><span>Continue as Demo</span>
          </button>
        )}

        {authModalMode !== 'forgot' && !realBackend && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500"><span>QUICK DEMO PERSONA SWITCHER</span><Sparkles className="w-3.5 h-3.5 text-vybe-lime" /></div>
            <div className="grid grid-cols-2 gap-2">
              {profiles.slice(0, 4).map(profile => (
                <button key={profile.id} onClick={() => handleDemoLogin(profile.email)} className="p-2 rounded-xl bg-white dark:bg-vybe-dark-card text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:border-vybe-lime transition-all text-left">
                  <span className="block font-display">{profile.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">@{profile.username}{profile.isAdmin ? ' · Admin' : ''}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3"><div className="flex-1 h-px bg-slate-200 dark:bg-white/10" /><span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">or</span><div className="flex-1 h-px bg-slate-200 dark:bg-white/10" /></div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalMode === 'register' && (
            <>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Your Full Name</label><input type="text" required placeholder="e.g. Alex Rivera" value={name} onChange={e => setName(e.target.value)} autoComplete="name" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Username</label><input type="text" required placeholder="e.g. alex_vybes" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none" /></div>
            </>
          )}

          <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label><input type="email" required placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none" /></div>

          {realBackend && authModalMode !== 'forgot' && (
            <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</label><input type="password" required minLength={6} data-testid="auth-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete={authModalMode === 'login' ? 'current-password' : 'new-password'} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none" /></div>
          )}

          <button type="submit" disabled={busy} className="w-full py-3.5 rounded-2xl bg-vybe-lime text-black font-display font-extrabold text-xs uppercase tracking-wider shadow-neon-lime hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:scale-100">
            <span>{authModalMode === 'login' ? 'Sign In & Discover' : authModalMode === 'register' ? 'Create Account' : authModalMode === 'forgot' ? 'Send Reset Link' : 'Update Profile'}</span>
            {authModalMode === 'forgot' ? <KeyRound className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
          {authModalMode === 'forgot' ? (
            <p>Remembered it? <button onClick={() => setAuthModalMode('login')} className="text-vybe-lime font-bold hover:underline">Back to sign in</button></p>
          ) : authModalMode === 'login' ? (
            <p>Don't have an account? <button onClick={() => setAuthModalMode('register')} className="text-vybe-lime font-bold hover:underline">Sign up free</button></p>
          ) : (
            <p>Already have an account? <button onClick={() => setAuthModalMode('login')} className="text-vybe-lime font-bold hover:underline">Log in</button></p>
          )}
          {authModalMode === 'login' && <p><button onClick={() => setAuthModalMode('forgot')} className="text-slate-400 hover:text-vybe-lime font-semibold hover:underline inline-flex items-center gap-1"><KeyRound className="w-3 h-3" />Forgot your password?</button></p>}
        </div>
      </div>
    </div>
  );
};
