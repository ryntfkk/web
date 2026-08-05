import type { Metadata } from 'next';
import React from 'react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import LegalMarkdown from '@/components/legal/LegalMarkdown';
import { getLegalDocument, formatEffectiveDate } from '@/lib/legal';

// Isi dari tabel legal_documents . lihat catatan di app/terms/page.tsx.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Kebijakan Privasi',
  description: 'Kebijakan Privasi POSKO Jasa - bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda.',
  alternates: { canonical: 'https://poskojasa.com/privacy' },
};

export default async function PrivacyPage() {
  const doc = await getLegalDocument('privacy');

  return (
    <div className="page-h bg-brand-gray-60">
      <MobilePageHeader title="Kebijakan Privasi" titleAs="p" backHref="/" maxWidthClass="max-w-2xl" />
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <h1 className="hidden lg:block text-3xl font-bold text-brand-gray-900 mb-2">
          {doc?.title ?? 'Kebijakan Privasi'}
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
