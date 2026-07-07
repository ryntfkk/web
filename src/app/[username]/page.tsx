import PartnerProfileClient from './PartnerProfileClient';

// Allow dynamic params — any username is valid (fetched from API at runtime).
// This replaces the old hardcoded VALID_USERNAMES whitelist that caused 404
// for any partner not in the list.
export const dynamicParams = true;

// Type for the params
interface PageProps {
  params: Promise<{ username: string }>;
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
