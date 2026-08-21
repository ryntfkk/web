import { useCallback, useEffect, useState } from 'react';

/**
 * Jeda kirim-ulang kode (F4, audit 2026-08-21).
 *
 * Tanpa jeda, tombol "kirim ulang" aktif kembali begitu request selesai. Yang
 * terjadi di lapangan: pengguna yang belum menerima WhatsApp menekannya
 * berkali-kali, tiap tekanan menembak limiter `otp-send` (10 per 15 menit), dan
 * ia mengunci DIRINYA SENDIRI dari alur yang sedang ia coba selesaikan . lalu
 * menyimpulkan aplikasinya rusak.
 *
 * Ini jeda UX di klien, BUKAN kontrol keamanan: limiter server tetap penjaga
 * sesungguhnya. Karena itu jeda tidak perlu tahan-otak-atik.
 *
 * Pola yang sama sudah dipakai `WithdrawForm` (OTP penarikan). Dipisah ke hook
 * supaya alur berikutnya tidak menyalin timer-nya lagi . salinan ketiga pasti
 * yang lupa `clearTimeout`.
 */
export function useResendCooldown(detik = 60) {
  const [sisa, setSisa] = useState(0);

  useEffect(() => {
    if (sisa <= 0) return;
    const t = setTimeout(() => setSisa((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sisa]);

  const mulai = useCallback(() => setSisa(detik), [detik]);
  const reset = useCallback(() => setSisa(0), []);

  return { sisa, aktif: sisa > 0, mulai, reset };
}
