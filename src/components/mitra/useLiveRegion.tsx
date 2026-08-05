'use client';

import { useCallback, useState } from 'react';

/**
 * Pengumuman hasil aksi asinkron untuk pembaca layar (P2 a11y).
 *
 * Toast di aplikasi ini dirender di luar alur baca dan tanpa `role="status"`,
 * jadi pengguna pembaca layar tidak pernah tahu bahwa "Layanan diaktifkan" atau
 * "Gagal menyimpan" barusan terjadi . bagi mereka tombol itu tampak tidak
 * melakukan apa pun. Live region menutup celah itu tanpa mengubah tampilan.
 *
 * `politeness`: pakai `assertive` hanya untuk kegagalan yang menghentikan
 * pekerjaan; selebihnya `polite` agar tidak memotong bacaan yang sedang jalan.
 *
 * Pesan disimpan bersama penghitung agar dua pengumuman yang sama persis
 * berturut-turut tetap dibacakan . tanpa itu React tidak me-render ulang dan
 * pengumuman kedua hilang diam-diam.
 */
export function useLiveRegion() {
  const [state, setState] = useState<{ message: string; nonce: number }>({ message: '', nonce: 0 });
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback((message: string, level: 'polite' | 'assertive' = 'polite') => {
    setPoliteness(level);
    setState((prev) => ({ message, nonce: prev.nonce + 1 }));
  }, []);

  const liveRegion = (
    <div
      key={state.nonce}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {state.message}
    </div>
  );

  return { announce, liveRegion };
}
