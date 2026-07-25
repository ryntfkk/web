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

// `/[username]` adalah catch-all di ROOT: setiap URL tak dikenal (/kontak,
// /promo-lebaran, dst.) mendarat di sini. Dulu semuanya dijawab HTTP 200 berisi
// "Tidak Ditemukan" = SOFT-404 tanpa batas — Google menganggapnya halaman valid
// dan memboroskan crawl budget pada URL yang jumlahnya tak terhingga.
// Dibedakan bertingkat: 'missing' → 404 sungguhan; 'error' (API bermasalah) →
// JANGAN 404, agar saat API down profil mitra yang sah tidak hilang dari indeks.
type PartnerResult =
  | { kind: 'ok'; data: PartnerProfileData }
  | { kind: 'missing' }
  | { kind: 'error' };

async function getPartner(enc: string): Promise<PartnerResult> {
  try {
    const res = await fetch(`${SERVER_API}/partners/${enc}`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 60 },
    });
    if (res.status === 400 || res.status === 404) return { kind: 'missing' };
    if (!res.ok) return { kind: 'error' };
    const json = await res.json();
    const data = json?.data as PartnerProfileData | undefined;
    return data && data.name ? { kind: 'ok', data } : { kind: 'missing' };
  } catch {
    return { kind: 'error' };
  }
}

export const dynamicParams = true;
// Caching data ada di level fetch (`next: { revalidate }`), bukan di level
// halaman. Route ini catch-all di root; penanganan URL tak dikenal (soft-404)
// dijelaskan di getPartner() & notFound() di bawah.


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

  {
    const r = await getPartner(encodeURIComponent(username));
    if (r.kind === 'missing') {
      // noindex sebagai lapis kedua; halaman juga membalas 404 sungguhan.
      return { title: 'Mitra Tidak Ditemukan', robots: { index: false, follow: false } };
    }
    if (r.kind === 'ok') {
      const p = r.data;
      {
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
    // kind === 'error' (API bermasalah) → jatuh ke metadata generik di bawah.
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

  const { notFound } = await import('next/navigation');

  // Guard against undefined username only — validity is checked by the API
  if (!username) {
    notFound();
  }

  // Ambil data publik mitra (profil + layanan) di server SEKALI, lalu isi cache
  // React Query via setQueryData supaya klien hydrate tanpa refetch — sekaligus
  // datanya dipakai membangun JSON-LD di bawah.
  // Fetch di-dedupe Next dengan generateMetadata.
  const enc = encodeURIComponent(username);
  const [partnerResult, services] = await Promise.all([
    getPartner(enc),
    fetchData<PartnerService[]>(`/partners/${enc}/services`).catch(() => null),
  ]);

  // Mitra memang tidak ada → notFound(). Karena loading.tsx root membuat respons
  // nge-stream, status tetap 200 tapi Next otomatis menyisipkan noindex (+
  // generateMetadata set index:false). Google tak mengindeks halaman noindex →
  // soft-404 catch-all root teratasi. Saat API bermasalah ('error') halaman
  // tetap dirender & klien mencoba lagi.
  if (partnerResult.kind === 'missing') {
    notFound();
  }
  const profile = partnerResult.kind === 'ok' ? partnerResult.data : null;

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
