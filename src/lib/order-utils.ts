// ── Order data normalizer ────────────────────────────────────────────
// Helper to safely unwrap API responses.

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Ambil payload dari envelope API, apapun tingkat nesting-nya. */
export function unwrapData<T = any>(resData: any): T {
  if (resData && typeof resData === 'object' && 'data' in resData && resData.data !== undefined) {
    return resData.data as T;
  }
  return resData as T;
}
