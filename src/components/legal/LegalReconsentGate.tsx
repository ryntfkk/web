"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import type { LegalDocument } from '@/hooks/useLegalConsent';

/**
 * Gerbang persetujuan ulang saat versi dokumen legal baru diterbitkan (D1).
 *
 * Tanpa ini, menerbitkan versi baru S&K tidak pernah ditagihkan ke pengguna
 * lama: mereka tetap terikat versi yang dulu mereka setujui, sementara aplikasi
 * berjalan dengan aturan yang baru. Selisih itu persis yang dipersoalkan saat
 * sengketa — "saya menyetujui teks yang mana?".
 *
 * Backend sudah menyediakan seluruh mekanismenya (`GET /legal/pending` +
 * `POST /legal/accept`); komponen ini hanya menagihnya.
 */

/** Halaman yang TIDAK boleh dihalangi modal. */
const EXEMPT_PREFIXES = ['/login', '/register', '/forgot-password', '/legal', '/terms', '/privacy'];

/**
 * Dokumen yang benar-benar menuntut PERSETUJUAN, bukan sekadar pemberitahuan.
 *
 * `cancellation` sengaja tidak masuk: ia kebijakan yang dirujuk S&K, bukan
 * kontrak terpisah — menagih centang untuknya hanya menambah gesekan.
 * `partner-terms` ikut ditagih karena ia kontrak tersendiri bagi mitra; bila
 * belum diterbitkan, `/legal/pending` tidak akan pernah mengembalikannya.
 */
const CONSENT_REQUIRED: LegalDocument['slug'][] = ['terms', 'privacy', 'partner-terms'];

export default function LegalReconsentGate() {
  const pathname = usePathname() ?? '';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const exempt = EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const { data: pending } = useQuery({
    queryKey: ['legal-pending'],
    // Hanya ditanyakan setelah sesi benar-benar pasti. Tanpa gate isInitializing,
    // permintaan menembak saat token belum dipulihkan → 401 → modal berkedip.
    enabled: isAuthenticated && !isInitializing && !exempt,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<LegalDocument[]> => {
      const res = await fetchAPI<LegalDocument[]>('/legal/pending');
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
  });

  const perluSetuju = (pending ?? []).filter((d) => CONSENT_REQUIRED.includes(d.slug));
  if (exempt || perluSetuju.length === 0) return null;

  const submit = async () => {
    setSubmitting(true);
    setError('');
    const res = await fetchAPI('/legal/accept', {
      method: 'POST',
      body: JSON.stringify({ document_ids: perluSetuju.map((d) => d.id) }),
    });
    setSubmitting(false);
    if (!res.success) {
      setError('Gagal menyimpan persetujuan. Periksa koneksi lalu coba lagi.');
      return;
    }
    qc.invalidateQueries({ queryKey: ['legal-pending'] });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reconsent-title"
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h2 id="reconsent-title" className="text-lg font-bold text-brand-gray-900">
          Ada pembaruan ketentuan
        </h2>
        <p className="mt-1 text-sm text-brand-gray-700">
          Kami memperbarui dokumen berikut. Mohon baca dan setujui untuk melanjutkan.
        </p>

        <ul className="mt-4 space-y-2">
          {perluSetuju.map((d) => (
            <li
              key={d.id}
              className="rounded-lg border border-brand-gray-100 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-gray-900">{d.title}</p>
                  <p className="text-xs text-brand-gray-450">Versi {d.version}</p>
                </div>
                <Link
                  href={d.slug === 'terms' || d.slug === 'privacy' ? `/${d.slug}` : `/legal/${d.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-medium text-brand-red hover:underline"
                >
                  Baca
                </Link>
              </div>
            </li>
          ))}
        </ul>

        {error && (
          <p className="mt-3 rounded-lg border border-brand-error-border bg-brand-error-soft p-2 text-xs text-brand-error">
            {error}
          </p>
        )}

        <Button
          onClick={submit}
          disabled={submitting}
          className="mt-4 h-11 w-full rounded-lg bg-brand-red text-base font-bold hover:bg-brand-red-dark"
        >
          {submitting ? 'Menyimpan…' : 'Saya setuju'}
        </Button>

        {/* Tidak ada tombol "nanti": persetujuan yang bisa ditunda tanpa batas
            sama saja dengan tidak menagihnya. Pengguna tetap bisa keluar lewat
            logout, dan halaman legal sendiri dikecualikan agar dokumennya
            selalu bisa dibaca. */}
      </div>
    </div>
  );
}
