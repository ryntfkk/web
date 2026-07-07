import PartnerProfileClient from './PartnerProfileClient';
import { API_URL } from '@/lib/api';

// Type for the params
interface PageProps {
  params: Promise<{ username: string }>;
}

// Pre-generate all partner profile pages at build time
export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/partners/usernames`, {
      headers: {
        'X-Platform': 'web',
        'X-App-Version': '1.0.0',
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error('Failed to fetch partner usernames');
      return [];
    }
    const json = await res.json();
    const usernames: string[] = json.data || [];
    return usernames.map((username) => ({ username }));
  } catch (error) {
    console.error('Error fetching partner usernames:', error);
    return [];
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;

  if (!username) {
    return {
      title: 'Partner Tidak Ditemukan | Posko Jasa',
      description: 'Profil partner tidak ditemukan',
    };
  }

  return {
    title: `Profil Partner - ${username} | Posko Jasa`,
    description: `Lihat profil dan layanan dari ${username} di Posko Jasa`,
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
