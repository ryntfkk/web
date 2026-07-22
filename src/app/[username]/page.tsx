import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import PartnerProfileClient from './PartnerProfileClient';
import { API_URL } from '@/lib/api';
import type { PartnerProfileData, PartnerService } from '@/hooks/usePartnerProfile';

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

  // Prefetch data publik mitra (profil + layanan) di server, lalu hydrate.
  // encodeURIComponent aman utk username. Gagal fetch → cache kosong, klien
  // refetch seperti biasa (perilaku not-found tetap ditangani PartnerProfileClient).
  const queryClient = new QueryClient();
  const enc = encodeURIComponent(username);
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['partnerProfile', username],
      queryFn: () => fetchData<PartnerProfileData>(`/partners/${enc}`),
    }),
    queryClient.prefetchQuery({
      queryKey: ['partnerServices', username],
      queryFn: () => fetchData<PartnerService[]>(`/partners/${enc}/services`),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PartnerProfileClient username={username} />
    </HydrationBoundary>
  );
}
