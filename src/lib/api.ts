import { useAuthStore } from './store/authStore';
import type { ApiResponse } from '@/types/api';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.poskojasa.com/api/v1';
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

// ── Token refresh state (module-level – outside React) ──────────────
let refreshPromise: Promise<boolean> | null = null;

/**
 * Call the /auth/refresh endpoint (sends the HttpOnly refresh_token cookie
 * via `credentials: 'include'`). Returns true if a new access token was
 * obtained, false otherwise.
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // sends the HttpOnly refresh_token cookie
      headers: {
        'X-Platform': 'web',
        'X-App-Version': APP_VERSION,
      },
    });

    if (!res.ok) return false;

    const json = await res.json();
    if (json.success && json.data?.access_token) {
      useAuthStore.getState().setAccessToken(json.data.access_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Public helper so the AuthProvider can trigger a silent refresh on app
 * start-up without duplicating the refresh logic.
 *
 * PENTING: memakai dedup `refreshPromise` yang sama dengan jalur retry-401
 * di fetchAPI. Tanpa ini, dua request /auth/refresh bisa berjalan paralel
 * saat app start; karena backend me-rotate refresh token, request kedua
 * membawa cookie lama yang sudah dihapus → sesi mati → user terlempar.
 */
export async function silentRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Parse a Response into ApiResponse<T> TANPA mengasumsikan selalu ada body JSON.
 * Respons 204 No Content / body kosong dari mutasi sukses (mis. DELETE foto) tak
 * punya envelope; `response.json()` akan melempar dan catch luar mengubah sukses
 * jadi "Network error" palsu. Tangani body kosong/non-JSON berdasarkan status,
 * lalu tempelkan `status` (beberapa UI membaca res.status).
 */
async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  let data: ApiResponse<T>;
  if (response.status === 204) {
    data = { success: response.ok };
  } else {
    const text = await response.text();
    if (!text) {
      data = response.ok
        ? { success: true }
        : { success: false, error: `HTTP ${response.status}` };
    } else {
      try {
        data = JSON.parse(text) as ApiResponse<T>;
      } catch {
        data = response.ok
          ? { success: true }
          : { success: false, error: `HTTP ${response.status}` };
      }
    }
  }
  if (typeof data === 'object' && data !== null) {
    (data as ApiResponse<T> & { status?: number }).status = response.status;
  }
  return data;
}

// ── Public API helper ───────────────────────────────────────────────

export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const accessToken = useAuthStore.getState().accessToken;
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('X-Platform', 'web');
    headers.set('X-App-Version', APP_VERSION);

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: options.credentials || 'omit',
      headers,
    });

    // ── 401 → attempt token refresh then retry ONCE ─────────────────
    if (response.status === 401 && endpoint !== '/auth/refresh') {
      // Satu jalur refresh untuk seluruh app (dedup via silentRefresh)
      const refreshed = await silentRefresh();

      if (refreshed) {
        // Retry the original request with the new access token
        const newToken = useAuthStore.getState().accessToken;
        const retryHeaders = new Headers(options.headers);
        retryHeaders.set('Content-Type', 'application/json');
        retryHeaders.set('X-Platform', 'web');
        retryHeaders.set('X-App-Version', APP_VERSION);
        if (newToken) {
          retryHeaders.set('Authorization', `Bearer ${newToken}`);
        }

        const retryResponse = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          credentials: options.credentials || 'omit',
          headers: retryHeaders,
        });

        return parseResponse<T>(retryResponse);
      }

      // Refresh failed — clear auth state so the UI reacts
      useAuthStore.getState().logout();
    }

    return parseResponse<T>(response);
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    return { success: false, error: 'Network error or server unreachable', status: 0 };
  }
}

/**
 * Perform a raw fetch using the global API_URL and injecting authentication/platform headers.
 * Useful for FormData requests where Content-Type is auto-generated by the browser.
 */
export async function apiFetchRaw(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const accessToken = useAuthStore.getState().accessToken;
  const headers = new Headers(options.headers);
  
  if (!headers.has('X-Platform')) headers.set('X-Platform', 'web');
  if (!headers.has('X-App-Version')) headers.set('X-App-Version', '1.0.0');

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: options.credentials || 'omit',
    headers,
  });
}
