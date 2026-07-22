import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import ServiceDetailClient from '../ServiceDetailClient';
import { API_URL } from '@/lib/api';
import JsonLd from '@/components/seo/JsonLd';
import type { ServiceDetail } from '@/hooks/useServiceDetail';

// SE4/SE6: route dinamis per-layanan menggantikan pola /services?id=. URL bersih
// (/services/<id>) + metadata & structured data dari data layanan asli.
// URL lama tetap berfungsi: ServiceDetailClient fallback ke query ?id=.
interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 300;

const SITE = 'https://poskojasa.com';
// Base ABSOLUT: API_URL bisa relatif ('/api/v1') dan fetch relatif gagal di server Node.
const SERVER_API = API_URL.startsWith('http') ? API_URL : 'https://api.poskojasa.com/api/v1';

async function getService(id: string): Promise<ServiceDetail | null> {
  try {
    const res = await fetch(`${SERVER_API}/services/${encodeURIComponent(id)}`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as ServiceDetail) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const s = await getService(id);
  if (!s) {
    return { title: 'Layanan tidak ditemukan' };
  }
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
  const service = await getService(id);

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

  const breadcrumbSchema = service
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Beranda', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Layanan', item: `${SITE}/services` },
          { '@type': 'ListItem', position: 3, name: service.name, item: `${SITE}/services/${id}` },
        ],
      }
    : null;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {serviceSchema && <JsonLd data={serviceSchema} />}
      {breadcrumbSchema && <JsonLd data={breadcrumbSchema} />}
      <ServiceDetailClient serviceId={id} />
    </HydrationBoundary>
  );
}
