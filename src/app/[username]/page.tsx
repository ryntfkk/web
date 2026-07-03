import PartnerProfileClient from './PartnerProfileClient';

export async function generateStaticParams() {
  // For static export, we must define the paths to be generated.
  // In a real production setup without a Node server, this would need to fetch all active usernames
  // or use a different client-side routing approach.
  return [{ username: 'budisantoso' }]; 
}

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function PartnerProfilePage({ params }: PageProps) {
  const { username } = await params;
  
  return <PartnerProfileClient username={username} />;
}
