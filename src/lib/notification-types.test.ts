import { describe, expect, it } from 'vitest';

import { notificationSpec, KNOWN_NOTIFICATION_TYPES } from './notification-types';

/**
 * Penjaga regresi A09-T2.
 *
 * Daftar di bawah adalah tipe yang BENAR-BENAR ditulis backend (notify.ToUser /
 * notify.ToPartner) dan yang ada di tabel `notifications` produksi per
 * 2026-08-10. Bila backend menambah tipe baru dan lupa mendaftarkannya, test
 * ini merah . jauh lebih baik daripada notifikasi yang diam-diam salah arah.
 */
const TIPE_PRODUKSI = [
  'order_new', 'order_confirm', 'order_started', 'order_paid', 'order_payment',
  'order_earning', 'order_additional_fee', 'order_cancelled', 'order_cancelled_admin',
  'order_rescheduled_admin', 'order_status_admin', 'order_adjustment_admin',
  'order_disputed', 'dispute_opened', 'dispute_reply', 'dispute_resolved',
  'support_reply', 'support_resolved', 'review_reminder', 'withdrawal_rejected',
  'category_deactivated', 'category_request_approved', 'category_request_rejected',
];

describe('pemetaan tipe notifikasi', () => {
  it('seluruh tipe produksi terdaftar', () => {
    const hilang = TIPE_PRODUKSI.filter(t => !KNOWN_NOTIFICATION_TYPES.includes(t));
    expect(hilang).toEqual([]);
  });

  it('penarikan dana bisa diklik dan masuk tab transaksi', () => {
    // Inti bug: kode lama memeriksa `type === 'withdrawal'` padahal tipe
    // sebenarnya `withdrawal_rejected`, jadi kliknya tidak melakukan apa pun
    // dan notifikasi UANG ini absen dari tab transaksi.
    const s = notificationSpec('withdrawal_rejected');
    expect(s.target.kind).toBe('wallet');
    expect(s.category).toBe('transaction');
    expect(s.icon).toBe('withdrawal');
  });

  it('notifikasi bantuan tidak diarahkan ke halaman pesanan', () => {
    // `support_reply` membawa reference_id, jadi logika lama mengirimnya ke
    // /orders/<id> . halaman yang bukan miliknya.
    expect(notificationSpec('support_reply').target.kind).toBe('support');
    expect(notificationSpec('support_resolved').target.kind).toBe('support');
  });

  it('hanya order_payment yang menuju halaman pembayaran', () => {
    expect(notificationSpec('order_payment').target.kind).toBe('payment');
    // Biaya tambahan lewat persetujuan di halaman pesanan lebih dulu.
    expect(notificationSpec('order_additional_fee').target.kind).toBe('order');
  });

  it('tipe tak dikenal jatuh ke fallback, bukan undefined', () => {
    const s = notificationSpec('tipe_yang_belum_ada');
    expect(s.icon).toBe('system');
    expect(s.target.kind).toBe('order');
  });

  it('tipe kosong/undefined tidak melempar', () => {
    expect(() => notificationSpec(undefined)).not.toThrow();
    expect(notificationSpec('').icon).toBe('system');
  });
});
