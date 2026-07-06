'use client';

import { useEffect, useRef } from 'react';
import { silentRefresh, fetchAPI } from '@/lib/api';
import { useAuthStore, User } from '@/lib/store/authStore';

/**
 * AuthProvider — runs ONCE on app start to attempt a silent token refresh
 * using the HttpOnly refresh_token cookie set by the backend.
 *
 * Flow:
 * 1. Call POST /auth/refresh (credentials: 'include') → get new access_token
 * 2. Call GET /users/me with the new token → get user profile
 * 3. If both succeed → user is authenticated (in-memory only, no localStorage)
 * 4. If either fails → user stays unauthenticated, cookie was expired/missing
 *
 * This naturally syncs the frontend auth state with the backend's
 * remember-me cookie duration (24h without, 30d with).
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const ran = useRef(false);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const login = useAuthStore((s) => s.login);
  const finishInitialization = useAuthStore((s) => s.finishInitialization);

  useEffect(() => {
    // Strict Mode in dev fires effects twice — guard with a ref
    if (ran.current) return;
    ran.current = true;

    async function init() {
      try {
        // Step 1: try to refresh the access token via the HttpOnly cookie
        const refreshed = await silentRefresh();

        if (!refreshed) {
          finishInitialization();
          return;
        }

        // Step 2: fetch the user profile with the fresh access token
        const res = await fetchAPI<{ user: User }>('/users/me', {
          credentials: 'include',
        });

        if (res.success && res.data?.user) {
          const token = useAuthStore.getState().accessToken;
          if (token) {
            login(res.data.user, token);
            return;
          }
        }

        // If we have a token but couldn't fetch the profile, something is off
        // Clear auth and let the user proceed as unauthenticated
        finishInitialization();
      } catch {
        finishInitialization();
      }
    }

    init();
  }, [finishInitialization, login]);

  // Don't block rendering — children handle their own loading states.
  // The `isInitializing` flag is available in the store for any component
  // that wants to show a full-screen spinner during the initial check.
  return <>{children}</>;
}
