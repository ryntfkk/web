'use client';

import React, { useState } from 'react';
import {
  usePartnerProfile,
  usePartnerServices,
  usePartnerPortfolios,
  usePartnerReviews
} from '@/hooks/usePartnerProfile';
import ProfileHeader from '@/components/partner/ProfileHeader';
import AboutSection from '@/components/partner/AboutSection';
import ServicesList from '@/components/partner/ServicesList';
import PortfolioGrid from '@/components/partner/PortfolioGrid';
import ReviewSection from '@/components/partner/ReviewSection';
import { Button } from '@/components/ui/button';
import { ArrowLeft, WifiOff, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PartnerProfileClient({ username }: { username: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'services' | 'portfolio'>('services');

  const { data: profile, isLoading: isProfileLoading, isError: isProfileError, error: profileError } = usePartnerProfile(username);
  const { data: services, isLoading: isServicesLoading } = usePartnerServices(username);
  const { data: portfolios, isLoading: isPortfoliosLoading } = usePartnerPortfolios(username);
  const { data: reviewData, isLoading: isReviewsLoading } = usePartnerReviews(username);

  // Show loading state
  if (isProfileLoading) {
    return (
      <div className="page-h bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show error state when API is unreachable or partner not found
  if (isProfileError || !profile) {
    const isNetworkError = profileError instanceof TypeError &&
      (profileError.message.includes('Failed to fetch') || profileError.message.includes('NetworkError'));

    return (
      <div className="page-h bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          {isNetworkError ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Koneksi Gagal</h1>
              <p className="text-gray-500 mb-6">
                Tidak dapat terhubung ke server. Pastikan Anda terhubung ke internet dan coba lagi.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Mitra Tidak Ditemukan</h1>
              <p className="text-gray-500 mb-6">
                Maaf, kami tidak dapat menemukan profil mitra "{username}".
              </p>
            </>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.push('/')}>Kembali ke Beranda</Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-h bg-gray-50 pb-20 sm:pb-12">
      {/* Header Mobile Only */}
      <div className="sm:hidden bg-white px-4 py-3 sticky top-16 z-10 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <span className="font-medium text-gray-900 truncate">{profile.name}</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8">
        <div className="hidden sm:block mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        </div>

        <ProfileHeader profile={profile} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Tabs: Layanan / Portofolio */}
            <div id="services-tabs" className="bg-white rounded shadow-sm mb-4 sm:mb-6">
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setActiveTab('services')}
                  className={`flex-1 sm:flex-none sm:px-6 py-3 text-sm font-semibold text-center transition-colors border-b-2 -mb-px ${
                    activeTab === 'services'
                      ? 'border-[#b51822] text-[#b51822]'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Layanan
                </button>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className={`flex-1 sm:flex-none sm:px-6 py-3 text-sm font-semibold text-center transition-colors border-b-2 -mb-px ${
                    activeTab === 'portfolio'
                      ? 'border-[#b51822] text-[#b51822]'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Portofolio
                </button>
              </div>
              <div className="p-4 sm:p-6">
                {activeTab === 'services' ? (
                  <ServicesList services={services || []} profile={profile} isLoading={isServicesLoading} />
                ) : (
                  <PortfolioGrid portfolios={portfolios || []} isLoading={isPortfoliosLoading} />
                )}
              </div>
            </div>
            <ReviewSection reviews={reviewData?.reviews || []} summary={reviewData?.summary || { total_reviews: 0, avg_rating: 0, count_5: 0, count_4: 0, count_3: 0, count_2: 0, count_1: 0 }} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <AboutSection profile={profile} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
