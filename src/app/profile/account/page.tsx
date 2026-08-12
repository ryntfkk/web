"use client";

import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { ProfileSkeleton } from '@/components/ui/skeleton';
import AccountPageContent from '@/components/profile/AccountPageContent';

export default function AccountPage() {
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();

  if (authLoading) return <div className="page-h bg-brand-gray-60"><ProfileSkeleton /></div>;
  if (!isAuthorized || !user) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10 relative">
      <MobilePageHeader
        titleAs="p" title="Informasi Akun" backHref="/profile" maxWidthClass="max-w-2xl" />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 lg:mb-0">
          <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900">Informasi Akun</h1>
        </div>
        
        <AccountPageContent user={user} />
      </div>
    </div>
  );
}
