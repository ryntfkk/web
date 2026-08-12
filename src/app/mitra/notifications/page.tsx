"use client";

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton } from '@/components/ui/skeleton';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import NotificationsPageContent from '@/components/profile/NotificationsPageContent';

export default function MitraNotificationsPage() {
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized || !user) return null;

  return (
    <div className="pb-6">
      <MitraPageHeader
        title="Preferensi Notifikasi"
        variant="form"
        backHref="/mitra/profile"
        breadcrumbs={[{ label: 'Profil', href: '/mitra/profile' }, { label: 'Preferensi Notifikasi' }]}
      />

      <MitraPageContainer variant="form">
        <NotificationsPageContent />
      </MitraPageContainer>
    </div>
  );
}
