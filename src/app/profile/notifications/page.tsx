"use client";

import { Bell } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { ProfileSkeleton } from '@/components/ui/skeleton';
import NotificationsPageContent from '@/components/profile/NotificationsPageContent';

export default function NotificationSettingsPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();

  if (authLoading || !isAuthorized) {
    return <div className="page-h bg-brand-gray-60"><ProfileSkeleton /></div>;
  }

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
      <MobilePageHeader
        titleAs="p" title="Pengaturan Notifikasi" icon={<Bell className="w-5 h-5 text-brand-red" />} maxWidthClass="max-w-2xl" />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="hidden lg:flex text-2xl font-bold text-brand-gray-900 items-center gap-2 mb-4">
          <Bell className="w-6 h-6 text-brand-red" /> Pengaturan Notifikasi
        </h1>
        <NotificationsPageContent />
      </div>
    </div>
  );
}
