import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import LegalMarkdown from '@/components/legal/LegalMarkdown';
import { getLegalDocument, formatEffectiveDate, type LegalSlug } from '@/lib/legal';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

const SITE = 'https://poskojasa.com';

/**
 * Rute generik untuk dokumen legal yang TIDAK punya halaman khususnya sendiri.
 *
 * Latar: menerbitkan dokumen dari panel admin tidak otomatis membuat halamannya.
 * `cancellation` sempat terbit tanpa bisa dibaca siapa pun — `/cancellation`
 * malah tertangkap rute `[username]` dan merender "Mitra Tidak Ditemukan"
 * dengan status 200. Rute ini menutup celah itu sekaligus untuk dokumen legal
 * berikutnya (mis. `partner-terms`), tanpa perlu menambah folder tiap kali.
 */

// `privacy` & `terms` punya halaman kanoniknya sendiri dan dialihkan 308 di
// next.config.ts — BUKAN di sini. Redirect dari dalam page terbukti tidak
// tereksekusi pada deployment Amplify ini.

// Slug yang dilayani rute ini = kunci META di bawah. Satu sumber, jadi
// menambah dokumen legal baru cukup menambah satu entri.
const META: Record<string, { title: string; description: string }> = {
  cancellation: {
    title: 'Kebijakan Pembatalan & Refund',
    description:
      'Ketentuan pembatalan pesanan dan pengembalian dana di Posko Jasa — sebelum bayar, setelah bayar, dan bila mitra membatalkan.',
  },
  'partner-terms': {
    title: 'Syarat & Ketentuan Mitra',
    description:
      'Ketentuan yang berlaku bagi mitra penyedia jasa di Posko Jasa — verifikasi, kewajiban, komisi, dan pencairan dana.',
  },
};

/**
 * Hanya dokumen yang SUDAH terbit yang di-prerender.
 *
 * `partner-terms` sengaja dikecualikan: dokumennya masih draf, sehingga
 * mem-prerender-nya akan memanggang 404 ke dalam build. Dibiarkan dirender
 * on-demand supaya ia langsung hidup begitu admin menerbitkannya, tanpa
 * menunggu build web berikutnya.
 */
export function generateStaticParams() {
  return [{ slug: 'cancellation' }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // `robots: noindex` di sini BUKAN hiasan: `notFound()` pada rute dinamis
  // disajikan Amplify dengan status 200 (soft-404) — perilaku yang sama pada
  // /kategori, /services, dan /jasa. noindex-lah yang benar-benar mencegah
  // halaman kosong terindeks.
  const meta = META[slug];
  if (!meta) {
    return { title: 'Dokumen tidak ditemukan', robots: { index: false, follow: false } };
  }

  // Dokumen yang belum diterbitkan tidak boleh diindeks — halaman ini akan
  // menjadi 404 di render, dan meminta Google mengindeksnya hanya menghasilkan
  // soft-404.
  const doc = await getLegalDocument(slug as LegalSlug);
  if (!doc) {
    return { title: meta.title, robots: { index: false, follow: false } };
  }

  // Judul TANPA "| Posko Jasa": template di root layout sudah menambahkannya.
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `${SITE}/legal/${slug}` },
  };
}

export default async function LegalDocumentPage({ params }: PageProps) {
  const { slug } = await params;

  if (!META[slug]) notFound();

  const doc = await getLegalDocument(slug as LegalSlug);
  // Slug sah tapi dokumennya belum diterbitkan → 404 sungguhan, bukan halaman
  // kosong ber-status 200. Ini yang membedakannya dari perilaku `/cancellation`
  // sebelum rute ini ada.
  if (!doc) notFound();

  return (
    <div className="page-h bg-brand-gray-60">
      <MobilePageHeader
        title={doc.title}
        titleAs="p"
        backHref="/"
        maxWidthClass="max-w-2xl"
      />
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <h1 className="hidden lg:block text-3xl font-bold text-brand-gray-900 mb-2">
          {doc.title}
        </h1>
        <p className="text-sm text-brand-gray-400 mb-8">
          Berlaku sejak {formatEffectiveDate(doc.effective_at)} · versi {doc.version}
        </p>

        <div className="bg-white rounded-lg border border-brand-gray-100 p-6 md:p-8">
          <LegalMarkdown body={doc.body_md} />
        </div>
      </div>
    </div>
  );
}
