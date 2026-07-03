import { useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { useAuthStore, User } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authStore = useAuthStore();
  const router = useRouter();

  const login = async (identifier: string, password: string, rememberMe: boolean = false) => {
    setLoading(true);
    setError(null);
    const res = await fetchAPI<{ user: User; access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, remember_me: rememberMe }),
      credentials: 'include', // Important to receive the HttpOnly refresh token cookie
    });

    if (res.success && res.data) {
      // the backend returns user object mapped differently or exactly? Let's assume it maps correctly
      authStore.login(res.data.user, res.data.access_token);
      router.push('/');
    } else {
      setError(typeof res.error === 'object' ? res.error.message : (res.error || 'Login failed'));
    }
    setLoading(false);
    return res;
  };

  const sendOTP = async (phone: string) => {
    setLoading(true);
    setError(null);
    const res = await fetchAPI('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });

    if (!res.success) {
      setError(typeof res.error === 'object' ? res.error.message : (res.error || 'Failed to send OTP'));
    }
    setLoading(false);
    return res;
  };

  const verifyOTPAndRegister = async (phone: string, otp: string, username: string, name: string, password: string) => {
    setLoading(true);
    setError(null);
    const res = await fetchAPI<{ user: User; access_token: string }>('/auth/register/phone', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, username, name, password }),
      credentials: 'include',
    });

    if (res.success && res.data) {
      authStore.login(res.data.user, res.data.access_token);
      router.push('/');
    } else {
      setError(typeof res.error === 'object' ? res.error.message : (res.error || 'Registration failed'));
    }
    setLoading(false);
    return res;
  };

  const logout = async () => {
    setLoading(true);
    await fetchAPI('/auth/logout', { method: 'POST', credentials: 'include' });
    authStore.logout();
    router.push('/login');
    setLoading(false);
  };

  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    loading,
    error,
    login,
    sendOTP,
    verifyOTPAndRegister,
    logout,
  };
}
