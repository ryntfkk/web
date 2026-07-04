import { notFound } from 'next/navigation';
import PartnerProfileClient from './PartnerProfileClient';

// Generate static params for partner profile pages
// These are the partner usernames that will be pre-rendered at build time
export async function generateStaticParams() {
  const partnerUsernames = [
    { username: 'budiac' },
    { username: 'siticom' },
    { username: 'jokoplumb' },
    { username: 'antotech' },
  ];
  return partnerUsernames;
}

// Type for the params
interface PageProps {
  params: Promise<{ username: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  return {
    title: `Profil Partner - ${username} | Posko Jasa`,
    description: `Lihat profil dan layanan dari ${username} di Posko Jasa`,
  };
}

export default async function PartnerProfilePage({ params }: PageProps) {
  const { username } = await params;

  // For dynamic params not in static list, show 404
  const validUsernames = ['budiac', 'siticom', 'jokoplumb', 'antotech'];
  if (!validUsernames.includes(username)) {
    notFound();
  }

  return <PartnerProfileClient username={username} />;
}
