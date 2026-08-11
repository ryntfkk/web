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
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { WifiOff, RefreshCw, ShieldCheck, AlertTriangle, Zap, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';

export default function PartnerProfileClient({ username }: { username: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'services' | 'portfolio'>('services');

  const { data: profile, isLoading: isProfileLoading, isError: isProfileError, error: profileError } = usePartnerProfile(username);
  const { data: services, isLoading: isServicesLoading } = usePartnerServices(username);
  const { data: portfolios, isLoading: isPortfoliosLoading } = usePartnerPortfolios(username);
  // P1-07: 10 ulasan pertama dulu tidak punya jalan keluar sama sekali .
  // ulasan lama tak pernah bisa dibaca calon pelanggan.
  const [reviewLimit, setReviewLimit] = useState(10);
  const { data: reviewData, isFetching: isReviewsFetching } = usePartnerReviews(username, reviewLimit);
  // Jam operasional sudah lama tersedia sebagai endpoint publik dan dipakai
  // halaman produk, tetapi profil mitra . tempat orang justru mencarinya .
  // tidak pernah menampilkannya (C5).
  const { data: workingHours, isLoading: isHoursLoading } = usePartnerWorkingHours(profile?.id);

  // Dicatat sekali per profil, SETELAH profilnya benar-benar termuat (§12.1).
  // Menembakkannya saat mount akan ikut menghitung kunjungan ke username yang
  // tidak ada, dan funnel "profil → klik layanan" jadi bocor di angka pertama.
  const trackedProfileRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!profile?.id || trackedProfileRef.current === profile.id) return;
    trackedProfileRef.current = profile.id;
    track('public_partner_profile_viewed', {
      partner_username: username,
      is_verified: Boolean(profile.is_verified),
      partner_type: profile.partner_type ?? null,
    });
  }, [profile?.id, profile?.is_verified, profile?.partner_type, username]);

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
      {/* Header kontekstual . `MobilePageHeader` bersama, bukan tulis tangan.
          `backHref` (bukan `router.back()`) DISENGAJA: ini halaman PUBLIK yang
          ter-index Google, jadi sebagian besar pembukanya tiba tanpa riwayat
          sama sekali . dan pada mereka tombol back berbasis history tidak
          melakukan apa-apa (audit A5).

          titleAs="p": H1 halaman adalah nama mitra di dalam ProfileHeader. */}
      <MobilePageHeader
        title={profile.name}
        titleAs="p"
        backHref="/"
        maxWidthClass="max-w-4xl"
        gutterClass="px-4 sm:px-6"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8">
        <ProfileHeader profile={profile} />

        <div className="mt-4 sm:mt-6">
          {/* Main Content (Full Width) */}
          <div className="space-y-4 sm:space-y-6">
            {/* Tabs: Layanan / Portofolio */}
            <div id="services-tabs" className="bg-white rounded-md shadow-sm mb-4 sm:mb-6">
              {/* Semantik tab yang sebenarnya (audit D8): tanpa `role`/
                  `aria-selected`, pembaca layar hanya mengumumkan "tombol
                  Layanan", "tombol Portofolio" . tidak ada petunjuk bahwa
                  keduanya sekumpulan dan salah satunya sedang aktif. */}
              <div className="flex border-b border-brand-gray-100" role="tablist" aria-label="Konten mitra">
                {([
                  { key: 'services' as const, label: 'Layanan' },
                  { key: 'portfolio' as const, label: 'Portofolio' },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    role="tab"
                    id={`tab-${tab.key}`}
                    aria-selected={activeTab === tab.key}
                    aria-controls={`panel-${tab.key}`}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 sm:flex-none sm:px-6 py-3 text-sm font-semibold text-center transition-colors border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${activeTab === tab.key
                        ? 'border-brand-red text-brand-red'
                        : 'border-transparent text-brand-gray-400 hover:text-brand-gray-900'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div
                className="p-4 sm:p-6"
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
              >
                {activeTab === 'services' ? (
                  <ServicesList services={services || []} profile={profile} isLoading={isServicesLoading} />
                ) : (
                  <PortfolioGrid portfolios={portfolios || []} isLoading={isPortfoliosLoading} />
                )}
              </div>
            </div>

            {/* Responsivitas (E9) . badge dari data chat. Seluruh blok muncul
                HANYA bila backend mengirim response_stats (sampel cukup); mitra
                baru tidak ditampilkan "0%". */}
            {profile.response_stats && (
              <div className="bg-white rounded-md shadow-sm p-4 sm:p-5">
                <h2 className="text-base sm:text-lg font-semibold text-brand-gray-900 mb-3">Responsivitas</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.response_stats.response_time_label && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-success-soft px-3 py-1.5 text-xs font-semibold text-brand-success-dark">
                      <Zap className="w-3.5 h-3.5" />
                      {profile.response_stats.response_time_label}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-info-soft px-3 py-1.5 text-xs font-semibold text-brand-info-dark">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {profile.response_stats.response_rate}% chat dibalas
                  </span>
                </div>
              </div>
            )}

            {/* Jam operasional mitra */}
            <div className="bg-white rounded-md shadow-sm p-4 sm:p-5">
              <h2 className="text-base sm:text-lg font-semibold text-brand-gray-900 mb-3">Jam Operasional</h2>
              <ScheduleView workingHours={workingHours} isLoading={isHoursLoading} />
            </div>

            {/* Trust signals . pricing transparency + off-platform warning */}
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
