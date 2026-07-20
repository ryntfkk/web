import { normalizeNullString } from './api';

// ── Partner DTO ──────────────────────────────────────────────────────
// Strongly-typed contract for partner data from the API.
// Every component consuming partner data should use this instead of `any`.

export interface PartnerCategory {
  id: string;
  name: string;
  slug?: string;
  icon_url?: string | null;
}

export interface Partner {
  id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  categories: PartnerCategory[];
  avg_rating: number;
  total_reviews: number;
  /** Total pesanan selesai mitra (social proof di kartu). */
  total_orders: number;
  starting_price: number;
  distance_meters: number;
  distance_km: number;
  /** Lokasi kanonik (dari kolom partners.city/district/province). */
  city?: string | null;
  district?: string | null;
  province?: string | null;
  /** True when the partner is currently available / accepting orders. */
  is_available?: boolean;
}

// ── Normalization helpers ────────────────────────────────────────────

/**
 * Safely cast the categories field (now emitted as a proper JSON array by
 * the backend) to PartnerCategory[]. Returns an empty array on any unexpected
 * shape so the UI never crashes.
 */
export function normalizeCategories(raw: unknown): PartnerCategory[] {
  if (Array.isArray(raw)) return raw as PartnerCategory[];
  return [];
}

/**
 * Normalize a raw API partner object into the strongly-typed Partner shape.
 * The backend now sends clean JSON (no base64, no sql.NullString), so this
 * is primarily a type-safety + defensive-defaults layer.
 *
 * Does NOT mutate the original object (immutability — uses spread).
 */
export function normalizePartner(raw: Record<string, unknown>): Partner {
  return {
    id: String(raw.id ?? ''),
    username: String(raw.username ?? ''),
    name: String(raw.name ?? ''),
    avatar_url: normalizeNullString(raw.avatar_url),
    categories: normalizeCategories(raw.categories),
    avg_rating: Number(raw.avg_rating ?? 0),
    total_reviews: Number(raw.total_reviews ?? 0),
    total_orders: Number(raw.total_orders ?? 0),
    starting_price: Number(raw.starting_price ?? 0),
    distance_meters: Number(raw.distance_meters ?? 0),
    distance_km: Number(raw.distance_km ?? 0),
    city: normalizeNullString(raw.city),
    district: normalizeNullString(raw.district),
    province: normalizeNullString(raw.province),
    is_available: Boolean(raw.is_available ?? false),
  };
}
