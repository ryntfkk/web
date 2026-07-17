import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  roles: string[];
  active_role: string;
  partner_id?: string;
  balance: number;
  is_verified: boolean;
  is_suspended: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /** True while the initial silent refresh is still pending (app just loaded) */
  isInitializing: boolean;
  isAuthLoading: boolean;
  setAuthLoading: (loading: boolean) => void;
  login: (user: User, accessToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  /** Called by the API interceptor after a successful token refresh */
  setAccessToken: (token: string) => void;
  /** Called when the initial silent refresh completes (success or fail) */
  finishInitialization: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true, // starts true — AuthProvider flips it after silent refresh
  isAuthLoading: false,

  setAuthLoading: (loading) => set({ isAuthLoading: loading }),

  login: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true, isInitializing: false }),

  logout: () =>
    set({ user: null, accessToken: null, isAuthenticated: false, isInitializing: false }),

  updateUser: (updatedFields) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedFields } : null,
    })),

  setAccessToken: (token) => set({ accessToken: token }),

  finishInitialization: () => set({ isInitializing: false }),
}));
