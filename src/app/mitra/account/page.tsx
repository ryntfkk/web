"use client";

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import AccountPageContent from '@/components/profile/AccountPageContent';

export default function MitraAccountPage() {
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized || !user) return null;

  return (
    <div className="pb-6">
      <MitraPageHeader
        title="Informasi Akun"
        variant="form"
        backHref="/mitra/profile"
        breadcrumbs={[{ label: 'Profil', href: '/mitra/profile' }, { label: 'Informasi Akun' }]}
      />

      <MitraPageContainer variant="form">
        <AccountPageContent user={user} />
      </MitraPageContainer>
    </div>
  );
}
