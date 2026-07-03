export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.poskojasa.com/api/v1';

export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; pagination?: any; error?: any }> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Platform': 'web',
        'X-App-Version': '1.0.0',
        ...options.headers,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    return { success: false, error: 'Network error or server unreachable' };
  }
}
