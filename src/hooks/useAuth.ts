import { useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { useAuthStore, User } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/types/api';
import { safeRedirect } from '@/lib/utils';

export function useAuth() {
  const [error, setError] = useState<string | null>(null);
  const authStore = useAuthStore();
  const loading = authStore.isAuthLoading;
  const setLoading = authStore.setAuthLoading;
  const router = useRouter();

  const login = async (identifier: string, password: string, rememberMe: boolean = false, redirectUrl?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAPI<{ user: User; access_token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password, remember_me: rememberMe }),
        credentials: 'include', // Important to receive the HttpOnly refresh token cookie
      });

      if (res.success && res.data) {
        authStore.login(res.data.user, res.data.access_token);
        if (redirectUrl) {
          router.push(safeRedirect(redirectUrl));
        } else if (res.data.user.active_role === 'partner') {
          router.push('/mitra/dashboard');
        } else {
          router.push('/');
        }
        setLoading(false);
      } else {
        setError(getErrorMessage(res));
        setLoading(false);
      }
      return res;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const sendOTP = async (phone: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAPI('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });

      if (!res.success) {
        setError(getErrorMessage(res));
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTPAndRegister = async (phone: string, otp: string, username: string, name: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAPI<{ user: User; access_token: string }>('/auth/register/phone', {
        method: 'POST',
        body: JSON.stringify({ phone, otp, username, name, password }),
        credentials: 'include',
      });

      if (res.success && res.data) {
        authStore.login(res.data.user, res.data.access_token);
        router.push('/');
        setLoading(false);
      } else {
        setError(getErrorMessage(res));
        setLoading(false);
      }
      return res;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const switchRole = async (targetRole: 'customer' | 'partner') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAPI<{ user: User; access_token: string }>('/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({ target_role: targetRole }),
        credentials: 'include',
      });

      if (res.success && res.data) {
        authStore.updateUser(res.data.user);
        // If API returns new token on switch-role:
        if (res.data.access_token) {
          authStore.setAccessToken(res.data.access_token);
        }
      } else {
        setError(getErrorMessage(res));
      }
      return res;
    } finally {
      // For switchRole, we can safely setLoading(false) because SwitchRoleModal handles its own loading state.
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Attempt to invalidate the refresh token on the server —
      // but ALWAYS clean up local state & redirect, even on network error.
      await fetchAPI('/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      authStore.logout();
      router.push('/login');
      setLoading(false);
    }
  };

  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    loading,
    error,
    login,
    sendOTP,
    verifyOTPAndRegister,
    switchRole,
    logout,
  };
}
