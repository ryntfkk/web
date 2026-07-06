// ── API Response Types ──────────────────────────────────────────────
// Matches the backend's utils.ErrorResponse and utils.SuccessResponse
// structures so the frontend can parse errors consistently.

/** Structured error detail from the backend (e.g. validation errors). */
export interface ApiErrorDetail {
  message?: string;
  [key: string]: unknown;
}

/** Generic API response envelope returned by every endpoint. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  /** Machine-readable error code from the backend (e.g. "AUTH_OTP_EXPIRED"). */
  code?: string;
  /** Can be a plain string, a structured object, or null. */
  error?: string | ApiErrorDetail | null;
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Extract a human-readable error message from an API response,
 * regardless of whether the backend sent `error` as a string or an object.
 *
 * Priority:
 *  1. error.message  (structured backend ErrorResponse)
 *  2. error as string
 *  3. response message
 *  4. generic fallback
 */
export function getErrorMessage(res: ApiResponse): string {
  if (typeof res.error === 'object' && res.error !== null) {
    const detail = res.error as ApiErrorDetail;
    if (detail.message) return detail.message;
  }
  if (typeof res.error === 'string' && res.error.length > 0) {
    return res.error;
  }
  if (res.message) return res.message;
  return 'Terjadi kesalahan. Silakan coba lagi.';
}

/**
 * Normalize a nullable string value.
 * Backend now sends `*string` → JSON `null` or `"value"`, so this is a
 * thin safety wrapper that also guards against unexpected shapes at runtime.
 */
export function normalizeNullString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  // Defensive: if somehow an object leaks through, return null rather than crash
  return null;
}
