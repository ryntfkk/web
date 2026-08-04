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
import ScheduleView from '@/components/service/ScheduleView';
import { usePartnerWorkingHours } from '@/hooks/useServiceDetail';
import { Button } from '@/components/ui/button';
import { ProfileSkeleton } from '@/components/ui/skeleton';
import { ArrowLeft, WifiOff, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PartnerProfileClient({ username }: { username: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'services' | 'portfolio'>('services');

  const { data: profile, isLoading: isProfileLoading, isError: isProfileError, error: profileError } = usePartnerProfile(username);
  const { data: services, isLoading: isServicesLoading } = usePartnerServices(username);
  const { data: portfolios, isLoading: isPortfoliosLoading } = usePartnerPortfolios(username);
  // P1-07: 10 ulasan pertama dulu tidak punya jalan keluar sama sekali —
  // ulasan lama tak pernah bisa dibaca calon pelanggan.
  const [reviewLimit, setReviewLimit] = useState(10);
  const { data: reviewData, isFetching: isReviewsFetching } = usePartnerReviews(username, reviewLimit);
  // Jam operasional sudah lama tersedia sebagai endpoint publik dan dipakai
  // halaman produk, tetapi profil mitra — tempat orang justru mencarinya —
  // tidak pernah menampilkannya (C5).
  const { data: workingHours, isLoading: isHoursLoading } = usePartnerWorkingHours(profile?.id);

  // Show loading state
  if (isProfileLoading) {
    return <div className="page-h bg-brand-gray-60"><ProfileSkeleton /></div>;
  }

  // Show error state when API is unreachable or partner not found
  if (isProfileError || !profile) {
    const isNetworkError = profileError instanceof TypeError &&
      (profileError.message.includes('Failed to fetch') || profileError.message.includes('NetworkError'));

    return (
      <div className="page-h bg-brand-gray-60 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          {isNetworkError ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-md bg-brand-error-light flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-brand-red" />
              </div>
              <h1 className="text-2xl font-bold text-brand-gray-900 mb-2">Koneksi Gagal</h1>
              <p className="text-brand-gray-700 mb-6">
                Tidak dapat terhubung ke server. Pastikan Anda terhubung ke internet dan coba lagi.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-brand-gray-900 mb-2">Mitra Tidak Ditemukan</h1>
              <p className="text-brand-gray-700 mb-6">
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
    <div className="page-h bg-brand-gray-60 pb-20 sm:pb-12">
      {/* Header kontekstual (tombol kembali) — hanya mobile. Di desktop TopNavbar
          sudah jadi satu-satunya header.
          top-0, bukan top-16: HeaderWrapper menyembunyikan TopNavbar di mobile
          untuk rute profil mitra, jadi tidak ada apa pun di atas header ini.
          Sebelumnya top-16 menggeser header ini ke bawah TopNavbar — menambal
          tampilan dua header, bukan menghapusnya. */}
      <div className="bg-white px-4 py-3 sticky top-0 z-10 border-b border-brand-gray-100 flex items-center gap-3 lg:hidden">
        <button
          onClick={() => router.back()}
          aria-label="Kembali"
          className="p-1.5 -ml-1 hover:bg-brand-gray-60 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-brand-gray-700" />
        </button>
        <span className="font-semibold text-brand-gray-900 truncate">{profile.name}</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8">
        <ProfileHeader profile={profile} />

        <div className="mt-4 sm:mt-6">
          {/* Main Content (Full Width) */}
          <div className="space-y-4 sm:space-y-6">
            {/* Tabs: Layanan / Portofolio */}
            <div id="services-tabs" className="bg-white rounded-md shadow-sm mb-4 sm:mb-6">
              <div className="flex border-b border-brand-gray-100">
                <button
                  onClick={() => setActiveTab('services')}
                  className={`flex-1 sm:flex-none sm:px-6 py-3 text-sm font-semibold text-center transition-colors border-b-2 -mb-px ${
                    activeTab === 'services'
                      ? 'border-brand-red text-brand-red'
                      : 'border-transparent text-brand-gray-400 hover:text-brand-gray-900'
                  }`}
                >
                  Layanan
                </button>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className={`flex-1 sm:flex-none sm:px-6 py-3 text-sm font-semibold text-center transition-colors border-b-2 -mb-px ${
                    activeTab === 'portfolio'
                      ? 'border-brand-red text-brand-red'
                      : 'border-transparent text-brand-gray-400 hover:text-brand-gray-900'
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

            {/* Jam operasional mitra */}
            <div className="bg-white rounded-md shadow-sm p-4 sm:p-5">
              <h2 className="text-base sm:text-lg font-semibold text-brand-gray-900 mb-3">Jam Operasional</h2>
              <ScheduleView workingHours={workingHours} isLoading={isHoursLoading} />
            </div>

            {/* Trust signals — pricing transparency + off-platform warning */}
            <div className="bg-white rounded-md shadow-sm p-4 sm:p-5 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-brand-info mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-brand-info-dark mb-0.5">Pembayaran Dilindungi Escrow</p>
                  <p className="text-xs text-brand-gray-700 leading-snug">
                    Harga yang tertera adalah biaya jasa dasar. Biaya material atau peralatan tambahan, jika dibutuhkan, akan diajukan secara terpisah oleh mitra dan <strong>harus kamu setujui sebelum dibayar</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 pt-3 border-t border-brand-gray-100">
                <AlertTriangle className="w-4 h-4 text-brand-warning mt-0.5 shrink-0" />
                <p className="text-xs text-brand-warning-dark leading-snug">
                  <strong>Jangan bayar di luar platform.</strong> Semua transaksi harus melalui Posko Jasa untuk mendapat perlindungan escrow dan garansi layanan.
                </p>
              </div>
            </div>

            <ReviewSection
              reviews={reviewData?.reviews || []}
              summary={reviewData?.summary || { total_reviews: 0, avg_rating: 0, count_5: 0, count_4: 0, count_3: 0, count_2: 0, count_1: 0 }}
              footer={
                (reviewData?.reviews?.length ?? 0) < (reviewData?.summary?.total_reviews ?? 0) ? (
                  <Button
                    variant="outline"
                    isLoading={isReviewsFetching}
                    onClick={() => setReviewLimit((n) => n + 10)}
                  >
                    Muat ulasan lain
                  </Button>
                ) : null
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
