import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import PartnerProfileClient from './PartnerProfileClient';
import { API_URL } from '@/lib/api';
import JsonLd from '@/components/seo/JsonLd';
import type { PartnerProfileData, PartnerService } from '@/hooks/usePartnerProfile';

const SITE = 'https://poskojasa.com';

// Type for the params
interface PageProps {
  params: Promise<{ username: string }>;
}

// Base API ABSOLUT untuk fetch sisi-server. `API_URL` bisa relatif ('/api/v1',
// dipakai proxy dev di .env.local) — dan fetch relatif GAGAL di server Node.
// Pakai API_URL bila sudah absolut (http...), else fallback ke domain produksi.
const SERVER_API = API_URL.startsWith('http') ? API_URL : 'https://api.poskojasa.com/api/v1';

// P2/SE2: ambil data publik mitra di server agar konten profil (nama, bio, rating,
// layanan) masuk HTML awal — LCP cepat + kebaca crawler. queryKey & bentuk nilai
// SAMA seperti hook (usePartnerProfile/usePartnerServices) sehingga klien hydrate
// tanpa refetch. Portfolio & review (bawah lipatan) tetap di-fetch klien.
// THROW saat gagal: prefetchQuery menangkapnya sendiri → query tak tersimpan
// sebagai "sukses undefined" (React Query menolak data undefined), klien refetch.
async function fetchData<T>(path: string): Promise<T> {
  const res = await fetch(`${SERVER_API}${path}`, {
    headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`fetch ${path} -> ${res.status}`);
  const json = await res.json();
  return json?.data as T;
}

export const dynamicParams = true;
export const revalidate = 60; // Regenerate every 60 seconds


// generateStaticParams removed to fully embrace SSR using standalone Next.js server

// SE5: metadata dari data mitra ASLI (bukan sekadar string username). Judul tidak
// menyertakan "| Posko Jasa" karena template root (%s | Posko Jasa) sudah menambahkannya.
export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;

  if (!username) {
    return {
      title: 'Mitra Tidak Ditemukan',
      description: 'Profil mitra tidak ditemukan',
    };
  }

  try {
    const res = await fetch(`${SERVER_API}/partners/${encodeURIComponent(username)}`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 600 },
    });
    if (res.ok) {
      const json = await res.json();
      const p = json?.data;
      if (p && p.name) {
        const area = p.service_area ? ` di ${p.service_area}` : '';
        const desc = (p.bio && p.bio.trim())
          ? p.bio.trim().slice(0, 160)
          : `Layanan ${p.name}${area} — pesan lewat Posko Jasa.`;
        return {
          title: p.name,
          description: desc,
          alternates: { canonical: `https://poskojasa.com/${username}` },
          openGraph: {
            type: 'profile',
            title: p.name,
            description: desc,
            url: `https://poskojasa.com/${username}`,
            images: p.avatar_url ? [{ url: p.avatar_url }] : undefined,
          },
        };
      }
    }
  } catch {
    // API tak tersedia — fallback ke metadata generik di bawah.
  }

  return {
    title: `Profil Mitra — ${username}`,
    description: `Lihat profil dan layanan dari ${username} di Posko Jasa.`,
    alternates: { canonical: `https://poskojasa.com/${username}` },
  };
}

export default async function PartnerProfilePage({ params }: PageProps) {
  const resolvedParams = await params;
  const { username } = resolvedParams;

  // Guard against undefined username only — validity is checked by the API
  if (!username) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  // Ambil data publik mitra (profil + layanan) di server SEKALI, lalu isi cache
  // React Query via setQueryData supaya klien hydrate tanpa refetch — sekaligus
  // datanya dipakai membangun JSON-LD di bawah. `catch → null` menjaga halaman
  // tetap render bila API gagal (klien akan fetch ulang; not-found tetap
  // ditangani PartnerProfileClient). Fetch di-dedupe Next dengan generateMetadata.
  const enc = encodeURIComponent(username);
  const [profile, services] = await Promise.all([
    fetchData<PartnerProfileData>(`/partners/${enc}`).catch(() => null),
    fetchData<PartnerService[]>(`/partners/${enc}/services`).catch(() => null),
  ]);

  const queryClient = new QueryClient();
  if (profile) queryClient.setQueryData(['partnerProfile', username], profile);
  if (services) queryClient.setQueryData(['partnerServices', username], services);

  // SE6: LocalBusiness — nama, foto, area layanan, rating agregat.
  // aggregateRating HANYA disertakan bila ada ulasan: reviewCount 0 = schema
  // invalid & bisa kena penalti rich-result.
  const partnerSchema = profile
    ? {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: profile.name,
        url: `${SITE}/${username}`,
        ...(profile.bio ? { description: profile.bio.slice(0, 300) } : {}),
        ...(profile.avatar_url ? { image: profile.avatar_url } : {}),
        ...(profile.service_area ? { areaServed: profile.service_area } : {}),
        ...(profile.total_reviews > 0
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: profile.avg_rating,
                reviewCount: profile.total_reviews,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
      }
    : null;

  // SE6: BreadcrumbList — Beranda › nama mitra.
  const breadcrumbSchema = profile
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Beranda', item: SITE },
          { '@type': 'ListItem', position: 2, name: profile.name, item: `${SITE}/${username}` },
        ],
      }
    : null;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {partnerSchema && <JsonLd data={partnerSchema} />}
      {breadcrumbSchema && <JsonLd data={breadcrumbSchema} />}
      <PartnerProfileClient username={username} />
    </HydrationBoundary>
  );
}
