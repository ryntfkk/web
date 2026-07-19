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

// ── Satuan harga layanan (unit) ─────────────────────────────────────
export type ServiceUnit = 'per_hour' | 'per_service' | 'per_unit' | 'per_kg';

/** Label singkat setelah "/" pada harga, mis. "Rp120.000 /jam". */
export function unitLabel(unit?: string): string {
  switch (unit) {
    case 'per_hour': return 'jam';
    case 'per_unit': return 'unit';
    case 'per_kg': return 'kg';
    case 'per_service':
    default: return 'jasa';
  }
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
