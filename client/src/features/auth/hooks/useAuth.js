import { useContext, useState } from 'react';
import { AuthContext } from '@/features/auth/state/authContext';
import * as authApi from '@/features/auth/services/authApi';
import { toast } from '@/shared/ui/use-toast';

// The single auth hook: it reads the shared user/session state from context and
// owns the orchestration (loading, error, toasts) so pages stay presentational.
// Each handler returns a boolean so the calling page can decide whether to
// navigate, without ever touching try/catch or toast itself.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async ({ email, password }) => {
    setError('');
    setLoading(true);
    try {
      await context.login(email, password);
      toast({ title: 'Welcome back!', description: 'Signed in successfully.', variant: 'success' });
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async ({ username, email, password }) => {
    setError('');
    setLoading(true);
    try {
      await context.register(username, email, password);
      toast({ title: 'Account created!', description: 'Welcome to LeetTracker.', variant: 'success' });
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await context.logout();
      toast({ title: 'Signed out', description: 'See you soon.', variant: 'success' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeetcodeUsername = async (nextUsername) => {
    setLoading(true);
    try {
      const normalizedUsername = nextUsername.trim();
      const res = await authApi.updateLeetcodeUsername(normalizedUsername);
      context.updateUser({ ...context.user, leetcodeUsername: res.data.leetcodeUsername });
      toast({ title: 'Settings saved', description: 'Your LeetCode username has been updated.', variant: 'success' });
      return true;
    } catch (err) {
      toast({ title: 'Failed to save settings', description: err.response?.data?.error || '', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    ...context,
    loading,
    error,
    handleLogin,
    handleRegister,
    handleLogout,
    handleUpdateLeetcodeUsername,
  };
};
