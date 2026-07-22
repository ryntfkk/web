import PartnerProfileClient from './PartnerProfileClient';
import { API_URL } from '@/lib/api';

// Type for the params
interface PageProps {
  params: Promise<{ username: string }>;
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
    const res = await fetch(`${API_URL}/partners/${encodeURIComponent(username)}`, {
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

  return <PartnerProfileClient username={username} />;
}
