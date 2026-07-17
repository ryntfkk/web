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

export type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled';

export const FILTER_GROUPS: Record<Exclude<FilterStatus, 'all'>, string[]> = {
  pending: ['WAITING_CONFIRMATION', 'WAITING_PAYMENT'],
  processing: ['PAID', 'IN_PROGRESS', 'WAITING_ADDITIONAL_PAY', 'WAITING_CUSTOMER_CONFIRM', 'DISPUTED'],
  completed: ['COMPLETED'],
  cancelled: ['CANCELLED'],
};

export function matchesFilter(status: string, filter: FilterStatus): boolean {
  if (filter === 'all') return true;
  return FILTER_GROUPS[filter].includes(status);
}
