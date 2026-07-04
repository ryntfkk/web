import { notFound } from 'next/navigation';
import PartnerProfileClient from './PartnerProfileClient';

// List of valid partner usernames for static generation
const VALID_USERNAMES = ['budiac', 'siticom', 'jokoplumb', 'antotech'];

// Generate static params for partner profile pages
// These are the partner usernames that will be pre-rendered at build time
export async function generateStaticParams() {
  return VALID_USERNAMES.map((username) => ({
    username,
  }));
}

// Type for the params
interface PageProps {
  params: Promise<{ username: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;

  // Return basic metadata even for invalid params to avoid build errors
  if (!username || !VALID_USERNAMES.includes(username)) {
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

  // Guard against undefined or invalid username
  if (!username || !VALID_USERNAMES.includes(username)) {
    notFound();
  }

  return <PartnerProfileClient username={username} />;
}
