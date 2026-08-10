'use client';

import SegmentError from '@/components/SegmentError';

/**
 * A13-T2. Batas paling penting dari sisi pemulihan: kegagalan di layar masuk /
 * daftar yang naik ke root membuat pengguna terjebak tanpa jalan mencoba ulang
 * selain memuat ulang peramban.
 */
export default function AuthError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentError
      {...props}
      konteks="auth"
      judul="Halaman ini gagal dimuat"
      keterangan="Coba lagi. Jika tetap gagal, muat ulang halaman atau kembali ke beranda."
    />
  );
}
