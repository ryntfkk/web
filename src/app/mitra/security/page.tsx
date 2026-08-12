"use client";

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import SecurityPageContent from '@/components/profile/SecurityPageContent';

export default function MitraSecurityPage() {
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized || !user) return null;

  return (
    <div className="pb-6">
      <MitraPageHeader
        title="Keamanan Akun"
        variant="form"
        backHref="/mitra/profile"
        breadcrumbs={[{ label: 'Profil', href: '/mitra/profile' }, { label: 'Keamanan Akun' }]}
      />

      <MitraPageContainer variant="form">
        <SecurityPageContent user={user} />
      </MitraPageContainer>
    </div>
  );
}
