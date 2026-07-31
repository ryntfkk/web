import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import ServiceDetailClient from '../ServiceDetailClient';
import { API_URL } from '@/lib/api';
import { slugify } from '@/lib/slug';
import JsonLd from '@/components/seo/JsonLd';
import type { ServiceDetail } from '@/hooks/useServiceDetail';

// SE4/SE6: route dinamis per-layanan menggantikan pola /services?id=. URL bersih
// (/services/<id>) + metadata & structured data dari data layanan asli.
// URL lama tetap berfungsi: ServiceDetailClient fallback ke query ?id=.
interface PageProps {
  params: Promise<{ id: string }>;
}

// Caching data ada di level fetch (`next: { revalidate: 300 }`), bukan di level
// halaman — jadi API tidak terbebani meski route ini dinamis (`ƒ`, karena segmen
// [id]). Catatan soft-404: lihat penjelasan notFound() di bawah.

const SITE = 'https://poskojasa.com';
// Base ABSOLUT: API_URL bisa relatif ('/api/v1') dan fetch relatif gagal di server Node.
const SERVER_API = API_URL.startsWith('http') ? API_URL : 'https://api.poskojasa.com/api/v1';

// Hanya UUID yang merupakan id layanan valid. Slug lama (mis. /services/elektronik)
// dulu dijawab HTTP 200 berisi "tidak ditemukan" = SOFT-404: Google menganggapnya
// halaman valid, memboroskan crawl budget & menurunkan sinyal kualitas.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Dibedakan bertingkat: 'missing' (memang tidak ada → 404 sungguhan) vs 'error'
// (API bermasalah → JANGAN 404, biar klien mencoba lagi; kalau tidak, saat API
// down semua halaman layanan yang sah ikut hilang dari indeks).
type ServiceResult =
  | { kind: 'ok'; data: ServiceDetail }
  | { kind: 'missing' }
  | { kind: 'error' };

async function getService(id: string): Promise<ServiceResult> {
  if (!UUID_RE.test(id)) return { kind: 'missing' };
  try {
    const res = await fetch(`${SERVER_API}/services/${encodeURIComponent(id)}`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 300 },
    });
    if (res.status === 400 || res.status === 404) return { kind: 'missing' };
    if (!res.ok) return { kind: 'error' };
    const json = await res.json();
    const data = json?.data as ServiceDetail | undefined;
    return data ? { kind: 'ok', data } : { kind: 'missing' };
  } catch {
    return { kind: 'error' };
  }
}

// SE: category_slug kini diekspos langsung di DTO ServiceDetail (backend update:
// query GetPublicServiceByID JOIN categories.slug). Tidak perlu fetch terpisah.

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const r = await getService(id);
  if (r.kind !== 'ok') {
    // noindex sebagai lapis kedua; halaman juga membalas 404 sungguhan di bawah.
    return { title: 'Layanan tidak ditemukan', robots: { index: false, follow: false } };
  }
  const s = r.data;
  const desc = (s.description?.trim() || `${s.name} oleh ${s.partner_name}`).slice(0, 160);
  return {
    title: s.name,
    description: desc,
    alternates: { canonical: `${SITE}/services/${id}` },
    openGraph: {
      type: 'website',
      title: s.name,
      description: desc,
      url: `${SITE}/services/${id}`,
      images: s.photo_url ? [{ url: s.photo_url }] : undefined,
    },
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getService(id);

  // Benar-benar tidak ada → notFound(). Karena ada loading.tsx root, respons
  // sudah nge-stream sehingga status tetap 200, TAPI Next otomatis menyisipkan
  // <meta name="robots" content="noindex"> (+ generateMetadata di atas juga
  // set index:false). Google TIDAK mengindeks halaman noindex → soft-404 teratasi
  // tanpa harus membuang loading.tsx. Saat API bermasalah ('error') kita TIDAK
  // panggil notFound() — halaman tetap dirender & klien mencoba memuat ulang.
  if (result.kind === 'missing') {
    notFound();
  }
  const service = result.kind === 'ok' ? result.data : null;

  // SE: category_slug kini dari DTO langsung (backend sudah ekspos).
  // Bila slug kosong (kategori tanpa slug), link landing lokal skip.
  const categorySlug = service?.category_slug || null;
  const citySlug = service?.partner_city ? slugify(service.partner_city) : null;
  const localLandingHref =
    categorySlug && citySlug ? `/jasa/${categorySlug}/${citySlug}` : null;

  const queryClient = new QueryClient();
  if (service) queryClient.setQueryData(['serviceDetail', id], service);

  // SE6: Service + Offer. Rating dilekatkan pada `provider` (LocalBusiness),
  // BUKAN pada layanan — ulasan yang ada milik mitra, bukan layanan spesifik.
  // Menempelkannya ke layanan = schema menyesatkan & berisiko penalti rich-result.
  const serviceSchema = service
    ? {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service.name,
        ...(service.description ? { description: service.description.slice(0, 300) } : {}),
        ...(service.category_name ? { serviceType: service.category_name } : {}),
        ...(service.photo_url ? { image: service.photo_url } : {}),
        ...(service.partner_city ? { areaServed: service.partner_city } : {}),
        provider: {
          '@type': 'LocalBusiness',
          name: service.partner_name,
          url: `${SITE}/${service.partner_username}`,
          // SE: address untuk geotargeting — partner_city sudah ada di DTO.
          ...(service.partner_city
            ? {
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: service.partner_city,
                },
              }
            : {}),
          ...(service.partner_total_reviews > 0
            ? {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: service.partner_avg_rating,
                  reviewCount: service.partner_total_reviews,
                  bestRating: 5,
                  worstRating: 1,
                },
              }
            : {}),
        },
        offers: {
          '@type': 'Offer',
          price: service.price,
          priceCurrency: 'IDR',
          availability: 'https://schema.org/InStock',
          url: `${SITE}/services/${id}`,
        },
      }
    : null;

  // SE7: Product — melengkapi Service agar layanan ELIGIBLE tampil sebagai
  // "produk" di Google (gambar + harga, gaya kartu belanja). aggregateRating
  // dilekatkan di sini (bila ada ulasan) karena di marketplace ini mitra =
  // penjual langsung penawaran ini; rating mencerminkan pengalaman pembeli atas
  // jasa mitra. Kota mitra ikut disematkan (areaServed via Offer) agar Google
  // mengaitkan produk dengan lokasi basecamp (mendukung query "[jasa] [kota]").
  const productSchema = service
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: service.name,
        ...(service.description ? { description: service.description.slice(0, 300) } : {}),
        ...(service.photo_url ? { image: service.photo_url } : {}),
        ...(service.category_name ? { category: service.category_name } : {}),
        brand: { '@type': 'Brand', name: service.partner_name },
        ...(service.partner_total_reviews > 0
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: service.partner_avg_rating,
                reviewCount: service.partner_total_reviews,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
        offers: {
          '@type': 'Offer',
          price: service.price,
          priceCurrency: 'IDR',
          availability: 'https://schema.org/InStock',
          url: `${SITE}/services/${id}`,
          ...(service.partner_city ? { areaServed: service.partner_city } : {}),
          seller: {
            '@type': 'LocalBusiness',
            name: service.partner_name,
            url: `${SITE}/${service.partner_username}`,
            ...(service.partner_city ? { address: { '@type': 'PostalAddress', addressLocality: service.partner_city } } : {}),
          },
        },
      }
    : null;

  // SE: Breadcrumb — Beranda › [Kategori bila slug ada] › Layanan › [Nama].
  // Kategori ditautkan ke /kategori/[slug] (landing kategori SEO-optimized).
  // Bila slug tidak didapat (fetch gagal), kategori skip — breadcrumb tetap valid.
  const breadcrumbItems: { '@type': string; position: number; name: string; item: string }[] = [
    { '@type': 'ListItem', position: 1, name: 'Beranda', item: SITE },
  ];
  if (service?.category_name && categorySlug) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: breadcrumbItems.length + 1,
      name: service.category_name,
      item: `${SITE}/kategori/${categorySlug}`,
    });
  }
  breadcrumbItems.push({
    '@type': 'ListItem',
    position: breadcrumbItems.length + 1,
    name: 'Layanan',
    item: `${SITE}/services`,
  });
  if (service) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: breadcrumbItems.length + 1,
      name: service.name,
      item: `${SITE}/services/${id}`,
    });
  }
  const breadcrumbSchema = service
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems,
      }
    : null;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {serviceSchema && <JsonLd data={serviceSchema} />}
      {productSchema && <JsonLd data={productSchema} />}
      {breadcrumbSchema && <JsonLd data={breadcrumbSchema} />}
      <ServiceDetailClient serviceId={id} categorySlug={categorySlug ?? undefined} localLandingHref={localLandingHref ?? undefined} />
    </HydrationBoundary>
  );
}
