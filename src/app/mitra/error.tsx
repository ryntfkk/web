'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import { Button } from '@/components/ui/button';

/**
 * Batas galat mode mitra . A13-T2.
 *
 * Sebelum ini SELURUH aplikasi (69 rute) hanya dijaga satu `error.tsx` di root.
 * Satu komponen yang melempar di mana pun naik sampai batas root dan mengganti
 * seluruh layar . termasuk sidebar dan navigasi . dengan halaman galat. Bukan
 * hipotesis: baris sqlc mentah yang dirender pernah menghasilkan "Objects are
 * not valid as a React child" dan halaman blank.
 *
 * Karena berkas ini berada di dalam `mitra/layout.tsx`, shell-nya TETAP HIDUP:
 * sidebar, navigasi, dan sesi tidak ikut hilang. Mitra bisa pindah halaman
 * tanpa memuat ulang aplikasi.
 *
 * Sengaja memakai MitraPageHeader + MitraPageContainer, bukan tata letak
 * sendiri . `layout-conventions.test.ts` menegakkan itu untuk seluruh halaman
 * mitra, dan halaman galat bukan pengecualian: justru di sinilah tata letak
 * paling mudah dilupakan.
 */
export default function MitraError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Batas galat mode mitra:', error);
  }, [error]);

  return (
    <>
      <MitraPageHeader title="Terjadi Kesalahan" />
      <MitraPageContainer>
        <div className="flex flex-col items-center gap-4 rounded-xl border border-brand-gray-100 bg-white p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-error-soft">
            <AlertCircle className="size-7 text-brand-red" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-gray-900">Halaman ini gagal dimuat</h2>
            <p className="mt-1 text-sm text-brand-gray-700">
              Bagian lain aplikasi tetap berjalan . kamu bisa mencoba lagi atau
              berpindah lewat menu.
            </p>
          </div>

          {/* `reset()` me-render ulang segmen ini saja. Tidak memuat ulang
              halaman, jadi sesi dan data yang sudah ter-cache tetap utuh. */}
          <Button onClick={() => reset()}>Coba Lagi</Button>

          {/* digest adalah satu-satunya penanda yang muncul di produksi .
              pesan aslinya sengaja disembunyikan Next. Menampilkannya membuat
              laporan mitra dapat dicocokkan dengan log server. */}
          {error.digest && (
            <p className="font-mono text-xs text-brand-gray-450">Kode: {error.digest}</p>
          )}
        </div>
      </MitraPageContainer>
    </>
  );
}
