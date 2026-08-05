import type { Metadata } from 'next';
import React from 'react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import LegalMarkdown from '@/components/legal/LegalMarkdown';
import { getLegalDocument, formatEffectiveDate } from '@/lib/legal';

// Isi halaman ini datang dari tabel legal_documents, BUKAN dari JSX.
// Teks yang sama tidak boleh disalin ke sini lagi: versi yang disetujui
// pengguna harus persis versi yang tersimpan sebagai bukti.
// Lihat PLAN-KONTEN-LEGAL-CMS.md §5.4 & DEVELOPER_NOTES §7e.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan',
  description: 'Syarat & Ketentuan penggunaan platform POSKO Jasa . aturan dan kewajiban bagi pelanggan dan mitra.',
  alternates: { canonical: 'https://poskojasa.com/terms' },
};

export default async function TermsPage() {
  const doc = await getLegalDocument('terms');

  return (
    <div className="page-h bg-brand-gray-60">
      <MobilePageHeader title="Syarat & Ketentuan" titleAs="p" backHref="/" maxWidthClass="max-w-2xl" />
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <h1 className="hidden lg:block text-3xl font-bold text-brand-gray-900 mb-2">
          {doc?.title ?? 'Syarat & Ketentuan'}
        </h1>
        {doc && (
          <p className="text-sm text-brand-gray-400 mb-8">
            Berlaku sejak {formatEffectiveDate(doc.effective_at)} · versi {doc.version}
          </p>
        )}

        <div className="bg-white rounded-lg border border-brand-gray-100 p-6 md:p-8">
          {doc ? (
            <LegalMarkdown body={doc.body_md} />
          ) : (
            // Lebih jujur menyatakan dokumen belum tersedia daripada menampilkan
            // halaman kosong yang terlihat seperti dokumen sah.
            <p className="text-sm text-brand-gray-700">
              Dokumen belum tersedia. Silakan hubungi kami melalui halaman{' '}
              <a href="/help" className="text-brand-red font-medium hover:underline">Bantuan</a>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
