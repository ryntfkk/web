import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Pastikan target redirect pasca-login tetap di origin kita (cegah open-redirect).
 * Hanya menerima path absolut satu-slash (mis. "/orders"); menolak "//evil.com",
 * "/\\evil.com", dan URL absolut (http://, https://, mailto:, dst).
 */
export function safeRedirect(path: string | null | undefined, fallback = '/'): string {
  if (!path || typeof path !== 'string') return fallback;
  if (!path.startsWith('/')) return fallback;        // relatif/absolut eksternal
  if (path.startsWith('//') || path.startsWith('/\\')) return fallback; // protocol-relative
  return path;
}

export function getInitial(name?: string | null): string {
  return name ? name.charAt(0).toUpperCase() : '?';
}
