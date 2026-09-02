import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

/**
 * Reusable authentication guard for protected actions.
 *
 * If a user is signed in (or in demo mode) the callback returns true and the
 * action proceeds. If the visitor is unauthenticated, the AuthModal is opened
 * (in the given mode) and the callback returns false — the action is aborted
 * instead of silently failing.
 *
 * Usage:
 *   const requireAuth = useRequireAuth();
 *   const handleSave = () => {
 *     if (!requireAuth()) return;
 *     toggleSavePlace(id);
 *   };
 */
export const useRequireAuth = (mode: 'login' | 'register' = 'login') => {
  const { currentUser } = useAuth();
  const { setIsAuthModalOpen, setAuthModalMode } = useData();

  return useCallback(() => {
    if (currentUser) return true;
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
    return false;
  }, [currentUser, mode, setAuthModalMode, setIsAuthModalOpen]);
};