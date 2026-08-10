'use client';

import SegmentError from '@/components/SegmentError';

/** A13-T2 . 9 halaman profil (alamat, dompet, pengaturan) berbagi batas ini. */
export default function ProfileError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentError
      {...props}
      konteks="profile"
      judul="Halaman profil gagal dimuat"
      keterangan="Data akunmu aman . ini hanya kegagalan menampilkan. Coba lagi atau berpindah lewat menu."
    />
  );
}
