'use client';

import SegmentError from '@/components/SegmentError';

/**
 * A13-T2. Detail pesanan memuat banyak bagian independen (ringkasan, jadwal,
 * biaya tambahan, ulasan, chat) . tanpa batas ini, satu bagian yang gagal
 * menghapus seluruh halaman beserta navigasinya.
 */
export default function OrdersError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentError
      {...props}
      konteks="orders"
      judul="Data pesanan gagal dimuat"
      keterangan="Pesananmu tidak hilang . ini hanya kegagalan menampilkan. Coba lagi, atau buka daftar pesanan lewat menu."
    />
  );
}
