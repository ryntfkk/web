import { useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { useAuthStore, User } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/types/api';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authStore = useAuthStore();
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
        router.push(redirectUrl || '/');
      } else {
        setError(getErrorMessage(res));
      }
      return res;
    } finally {
      setLoading(false);
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
      } else {
        setError(getErrorMessage(res));
      }
      return res;
    } finally {
      setLoading(false);
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
        authStore.login(res.data.user, res.data.access_token);
        router.push('/');
      } else {
        setError(getErrorMessage(res));
      }
      return res;
    } finally {
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
