// ── Payment helpers (single source of truth) ─────────────────────────
// Satu pola pembayaran untuk SEMUA halaman agar konsisten:
//   • Saldo dompet  → POST /payments/initiate (internal, instan)
//   • Online (Snap) → POST /payments/snap → redirect penuh ke halaman
//     Midtrans (menghindari isu CSP pada popup embedded snap.js).
//
// Sebelumnya tiap halaman mengimplementasikan sendiri (popup vs redirect,
// URL sandbox di-hardcode di beberapa tempat). Semua itu digantikan file ini.
/* eslint-disable @typescript-eslint/no-explicit-any */

import { fetchAPI } from './api';
import { unwrapData } from './order-utils';
import { getErrorMessage } from '@/types/api';

// Fallback base URL untuk redirect Snap bila backend tidak mengirim
// `redirect_url`. Backend Midtrans (sandbox/production) adalah sumber
// kebenaran untuk redirect_url; fallback ini hanya dipakai jika kosong.
// Set via env agar tidak ada URL yang di-hardcode di komponen.
// Sandbox : https://app.sandbox.midtrans.com/snap/v2/vtweb
// Produksi: https://app.midtrans.com/snap/v2/vtweb
const SNAP_REDIRECT_BASE =
  process.env.NEXT_PUBLIC_MIDTRANS_SNAP_REDIRECT_BASE ||
  'https://app.sandbox.midtrans.com/snap/v2/vtweb';

export type PayError = { status: 'error'; message: string; insufficientBalance?: boolean };
export type WalletPayResult = { status: 'wallet_success' } | PayError;
export type SnapPayResult = { status: 'redirecting' } | PayError;

/** True bila error berasal dari saldo dompet yang tidak mencukupi. */
export function isInsufficientBalance(res: {
  error?: unknown;
  message?: string;
}): boolean {
  const detail: any = res?.error;
  const code =
    (detail && typeof detail === 'object' && detail.code) || '';
  const msg = getErrorMessage(res as any) || '';
  return (
    code === 'WALLET_INSUFFICIENT_BALANCE' ||
    /INSUFFICIENT|tidak mencukupi|tidak cukup/i.test(msg)
  );
}

/** Bayar order menggunakan saldo dompet (internal, langsung selesai). */
export async function payOrderWithWallet(orderId: string): Promise<WalletPayResult> {
  const res = await fetchAPI(`/payments/initiate`, {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId, payment_method: 'wallet_balance' }),
  });
  if (res.success) return { status: 'wallet_success' };
  return {
    status: 'error',
    message: getErrorMessage(res),
    insufficientBalance: isInsufficientBalance(res),
  };
}

/**
 * Bayar order via Midtrans Snap. Meminta token lalu melakukan redirect
 * penuh ke halaman pembayaran Midtrans — SATU pola untuk semua halaman.
 * Pada sukses browser berpindah halaman (status 'redirecting' dikembalikan
 * tepat sebelum navigasi).
 */
export async function payOrderWithSnap(
  orderId: string,
  paymentMethod: string = 'online',
): Promise<SnapPayResult> {
  const res = await fetchAPI<any>(`/payments/snap`, {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId, payment_method: paymentMethod }),
  });
  return redirectToSnap(res);
}

/**
 * Bayar biaya tambahan (additional fee) via Midtrans Snap — jalur untuk
 * pelanggan yang saldo dompetnya tidak cukup. Backend menagih fee PENDING
 * tertua dan mengikatnya ke transaksi (fee_id di metadata).
 */
export async function payAdditionalFeeWithSnap(orderId: string): Promise<SnapPayResult> {
  const res = await fetchAPI<any>(`/payments/snap/additional`, {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId }),
  });
  return redirectToSnap(res);
}

function redirectToSnap(res: { success?: boolean; data?: unknown }): SnapPayResult {
  const snapData = res.success ? unwrapData<any>(res.data) : null;
  const redirectUrl =
    snapData?.redirect_url ||
    (snapData?.token ? `${SNAP_REDIRECT_BASE}/${snapData.token}` : '');

  if (redirectUrl) {
    if (typeof window !== 'undefined') window.location.href = redirectUrl;
    return { status: 'redirecting' };
  }
  return { status: 'error', message: getErrorMessage(res as any) };
}
