"use client";

import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { ProfileSkeleton } from '@/components/ui/skeleton';
import SecurityPageContent from '@/components/profile/SecurityPageContent';

export default function SecurityPage() {
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();

  if (authLoading) return <div className="page-h bg-brand-gray-60"><ProfileSkeleton /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
      <MobilePageHeader
        titleAs="p" title="Keamanan Akun" maxWidthClass="max-w-2xl" />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900 mb-6">Keamanan Akun</h1>
        
        <SecurityPageContent user={user} />
      </div>
    </div>
  );
}

