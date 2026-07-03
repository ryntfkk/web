import PartnerProfileClient from './PartnerProfileClient';

export async function generateStaticParams() {
  // For static export, we define the paths to be generated.
  // Using actual partner usernames from the production database
  return [
    { username: 'budiac' },
    { username: 'siticom' },
    { username: 'jokoplumb' },
    { username: 'antotech' }
  ]; 
}

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function PartnerProfilePage({ params }: PageProps) {
  const { username } = await params;
  
  return <PartnerProfileClient username={username} />;
}
