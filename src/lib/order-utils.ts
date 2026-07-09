// ── Order data normalizer ────────────────────────────────────────────
// Backend (types/api.ts OrderDetail) menggunakan nama field yang berbeda
// dengan yang dipakai komponen UI. Helper ini menyatukan keduanya agar
// setiap page pemesanan (detail, payment, additional-fee, list) selalu
// menerima bentuk data yang konsisten.

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface NormalizedFee {
  id: string;
  type: string; // 'extra_service' | 'material'
  item_name: string;
  unit_price: number;
  quantity: number;
  total: number;
  status: string;
  expired_at?: string;
}

/** Ambil payload dari envelope API, apapun tingkat nesting-nya. */
export function unwrapData<T = any>(resData: any): T {
  if (resData && typeof resData === 'object' && 'data' in resData && resData.data !== undefined) {
    return resData.data as T;
  }
  return resData as T;
}

export function normalizeFee(f: any): NormalizedFee {
  const unitPrice = f?.unit_price ?? f?.price ?? 0;
  const qty = f?.quantity ?? 1;
  return {
    ...f,
    id: f?.id ?? '',
    type: f?.type ?? f?.fee_type ?? 'material',
    item_name: f?.item_name ?? f?.name ?? '',
    unit_price: unitPrice,
    quantity: qty,
    total: f?.total ?? unitPrice * qty,
    status: String(f?.status ?? '').toUpperCase(),
    expired_at: f?.expired_at ?? f?.expires_at,
  };
}

/**
 * Normalisasi objek order dari backend ke bentuk yang dipakai UI.
 * Mendukung kedua konvensi nama field (lama & baru) sekaligus.
 */
export function normalizeOrder(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw;

  const items = (raw.items ?? []).map((it: any) => ({
    ...it,
    service_name: it?.service_name ?? it?.name ?? '',
    price: it?.price ?? 0,
    quantity: it?.quantity ?? 1,
  }));

  const additionalFees: NormalizedFee[] = (raw.additional_fees ?? []).map(normalizeFee);
  const pendingFee = additionalFees.find((f) => f.status === 'PENDING');

  const partnerInfo = raw.partner ?? raw.partner_info;
  const partner = partnerInfo
    ? {
        ...partnerInfo,
        id: partnerInfo.id,
        name: partnerInfo.name ?? '',
        username: partnerInfo.username ?? '',
        avatar_url: partnerInfo.avatar_url,
        rating: partnerInfo.rating,
        phone_masked: partnerInfo.phone_masked ?? partnerInfo.phone,
      }
    : undefined;

  return {
    ...raw,
    status: String(raw.status ?? '').toUpperCase(),
    items,
    additional_fees: additionalFees,
    additional_fee: raw.additional_fee ? normalizeFee(raw.additional_fee) : pendingFee,
    total_amount: raw.total_amount ?? raw.agreed_price ?? 0,
    service_address: raw.service_address ?? raw.address ?? '',
    photos: raw.photos ?? raw.photo_urls ?? [],
    payment_expired_at: raw.payment_expired_at ?? raw.payment_expires_at,
    promo_discount: raw.promo_discount ?? raw.discount_amount ?? 0,
    partner,
    partner_name: raw.partner_name ?? partner?.name,
  };
}
