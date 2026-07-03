import { useAuthStore } from './store/authStore';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.poskojasa.com/api/v1';

export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; pagination?: any; error?: any }> {
  try {
    const accessToken = useAuthStore.getState().accessToken;
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('X-Platform', 'web');
    headers.set('X-App-Version', '1.0.0');
    
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: options.credentials || 'omit', // Allow overriding credentials
      headers,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    return { success: false, error: 'Network error or server unreachable' };
  }
}
