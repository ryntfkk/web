import PartnerProfileClient from './PartnerProfileClient';
import { API_URL } from '@/lib/api';

// Type for the params
interface PageProps {
  params: Promise<{ username: string }>;
}

export const dynamicParams = true;
export const revalidate = 60; // Regenerate every 60 seconds


// generateStaticParams removed to fully embrace SSR using standalone Next.js server

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
