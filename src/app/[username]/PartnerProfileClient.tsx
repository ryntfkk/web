'use client';

import React from 'react';
import { use } from 'react';
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
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PartnerProfileClient({ username }: { username: string }) {
  const router = useRouter();

  const { data: profile, isLoading: isProfileLoading, isError: isProfileError } = usePartnerProfile(username);
  const { data: services, isLoading: isServicesLoading } = usePartnerServices(username);
  const { data: portfolios, isLoading: isPortfoliosLoading } = usePartnerPortfolios(username);
  const { data: reviewData, isLoading: isReviewsLoading } = usePartnerReviews(username);

  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (isProfileError || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mitra Tidak Ditemukan</h1>
        <p className="text-gray-500 mb-6 text-center">Maaf, kami tidak dapat menemukan profil mitra yang Anda cari.</p>
        <Button onClick={() => router.push('/')}>Kembali ke Beranda</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-12">
      {/* Header Mobile Only */}
      <div className="sm:hidden bg-white px-4 py-3 sticky top-0 z-10 border-b border-gray-100 flex items-center gap-3">
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
            <ServicesList services={services || []} />
            <PortfolioGrid portfolios={portfolios || []} />
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
