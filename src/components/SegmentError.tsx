'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Isi bersama untuk `error.tsx` per segmen rute pelanggan . A13-T2.
 *
 * Sebelum ini 69 rute hanya dijaga satu batas galat di root: satu komponen yang
 * melempar mengganti SELURUH layar, termasuk header dan navigasi. Batas per
 * segmen membuat kegagalan berhenti di segmennya . pengguna masih melihat
 * kerangka aplikasi dan bisa pindah halaman tanpa memuat ulang.
 *
 * Satu komponen dipakai bersama, bukan menyalin markup ke tiap `error.tsx`:
 * halaman galat adalah tempat yang paling jarang dibuka dan paling mudah
 * ketinggalan saat gaya berubah.
 *
 * Sengaja TIDAK memakai `min-h-screen` seperti batas root . berkas ini dirender
 * DI DALAM layout, jadi tinggi layar penuh akan mendorong footer & header
 * keluar dan justru menyerupai kegagalan total yang ingin dihindari.
 */
export default function SegmentError({
  error,
  reset,
  judul = 'Bagian ini gagal dimuat',
  keterangan = 'Bagian lain tetap berjalan . kamu bisa mencoba lagi atau berpindah lewat menu.',
  konteks,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  judul?: string;
  keterangan?: string;
  /** Nama segmen untuk log . mempersempit pencarian saat pengguna melapor. */
  konteks: string;
}) {
  useEffect(() => {
    console.error(`Batas galat segmen [${konteks}]:`, error);
  }, [error, konteks]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-brand-error-soft">
        <AlertCircle className="size-7 text-brand-red" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-brand-gray-900">{judul}</h2>
        <p className="mt-1 text-sm text-brand-gray-700">{keterangan}</p>
      </div>

      {/* `reset()` me-render ulang segmen ini saja . tanpa memuat ulang
          halaman, sehingga sesi dan cache yang sudah terisi tetap utuh. */}
      <Button onClick={() => reset()}>Coba Lagi</Button>

      {/* `digest` adalah satu-satunya penanda yang tersedia di produksi . Next
          sengaja menyembunyikan pesan aslinya. Menampilkannya membuat laporan
          pengguna dapat dicocokkan dengan log server. */}
      {error.digest && (
        <p className="font-mono text-xs text-brand-gray-450">Kode: {error.digest}</p>
      )}
    </div>
  );
}
