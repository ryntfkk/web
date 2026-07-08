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
  /** HTTP status code attached by the fetch wrapper */
  status?: number;
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

export interface OrderItem {
  id: string;
  service_id: string;
  name: string;
  price: number;
  quantity: number;
  duration: number;
}

export interface AdditionalFee {
  id: string;
  name: string;
  fee_type: string;
  price: number;
  quantity: number;
  total: number;
  status: string;
}

export interface CustomerInfo {
  id: string;
  name: string;
  phone: string;
}

export interface PartnerInfo {
  id: string;
  user_id: string;
  name: string;
  username: string;
  avatar_url?: string;
  phone: string;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  customer_id: string;
  partner_id: string;
  status: string;
  scheduled_at: string;
  address_id?: string;
  address: string;
  address_detail?: string;
  notes?: string;
  photo_urls: string[];
  total_service_price: number;
  transport_fee: number;
  admin_fee: number;
  promo_id?: string;
  discount_amount: number;
  agreed_price: number;
  cancellation_reason?: string;
  cancelled_by?: string;
  refunded_amount: number;
  version: number;
  created_at: string;
  updated_at: string;

  confirmed_at?: string;
  payment_expires_at?: string;
  paid_at?: string;
  started_at?: string;
  completed_at?: string;

  items: OrderItem[];
  additional_fees: AdditionalFee[];
  customer_info?: CustomerInfo;
  partner_info?: PartnerInfo;
}
