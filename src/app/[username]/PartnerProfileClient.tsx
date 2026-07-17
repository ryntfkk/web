'use client';

import React, { useState } from 'react';
import {
  usePartnerProfile,
  usePartnerServices,
  usePartnerPortfolios,
  usePartnerReviews
} from '@/hooks/usePartnerProfile';
import ProfileHeader from '@/components/partner/ProfileHeader';
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
      <div className="page-h bg-[#f7f5f4] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#b51822] border-t-transparent rounded-md"></div>
      </div>
    );
  }

  // Show error state when API is unreachable or partner not found
  if (isProfileError || !profile) {
    const isNetworkError = profileError instanceof TypeError &&
      (profileError.message.includes('Failed to fetch') || profileError.message.includes('NetworkError'));

    return (
      <div className="page-h bg-[#f7f5f4] flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          {isNetworkError ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-md bg-[#FED7D7] flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-[#b51822]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1c1b1b] mb-2">Koneksi Gagal</h1>
              <p className="text-[#5b403e] mb-6">
                Tidak dapat terhubung ke server. Pastikan Anda terhubung ke internet dan coba lagi.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#1c1b1b] mb-2">Mitra Tidak Ditemukan</h1>
              <p className="text-[#5b403e] mb-6">
                Maaf, kami tidak dapat menemukan profil mitra &quot;{username}&quot;.
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
    <div className="page-h bg-[#f7f5f4] pb-20 sm:pb-12">
      {/* Header kontekstual (tombol kembali) — hanya mobile. Di desktop TopNavbar
          sudah jadi satu-satunya header.
          top-0, bukan top-16: HeaderWrapper menyembunyikan TopNavbar di mobile
          untuk rute profil mitra, jadi tidak ada apa pun di atas header ini.
          Sebelumnya top-16 menggeser header ini ke bawah TopNavbar — menambal
          tampilan dua header, bukan menghapusnya. */}
      <div className="bg-white px-4 py-3 sticky top-0 z-10 border-b border-[#e5e2e1] flex items-center gap-3 lg:hidden">
        <button
          onClick={() => router.back()}
          className="p-1.5 -ml-1 hover:bg-[#f7f5f4] rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
        </button>
        <span className="font-semibold text-[#1c1b1b] truncate">{profile.name}</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8">
        <ProfileHeader profile={profile} />

        <div className="mt-4 sm:mt-6">
          {/* Main Content (Full Width) */}
          <div className="space-y-4 sm:space-y-6">
            {/* Tabs: Layanan / Portofolio */}
            <div id="services-tabs" className="bg-white rounded-md shadow-sm mb-4 sm:mb-6">
              <div className="flex border-b border-[#e5e2e1]">
                <button
                  onClick={() => setActiveTab('services')}
                  className={`flex-1 sm:flex-none sm:px-6 py-3 text-sm font-semibold text-center transition-colors border-b-2 -mb-px ${
                    activeTab === 'services'
                      ? 'border-[#b51822] text-[#b51822]'
                      : 'border-transparent text-[#8f6f6d] hover:text-[#1c1b1b]'
                  }`}
                >
                  Layanan
                </button>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className={`flex-1 sm:flex-none sm:px-6 py-3 text-sm font-semibold text-center transition-colors border-b-2 -mb-px ${
                    activeTab === 'portfolio'
                      ? 'border-[#b51822] text-[#b51822]'
                      : 'border-transparent text-[#8f6f6d] hover:text-[#1c1b1b]'
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
        </div>
      </div>
    </div>
  );
}
