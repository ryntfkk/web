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
import { StickyActionBar } from '@/components/ui/sticky-action-bar';
import { Modal } from '@/components/ui/modal';
import { WifiOff, RefreshCw, ShieldCheck, AlertTriangle, Zap, MessageCircle, LayoutGrid, Images, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useChatUiStore } from '@/lib/store/chatUiStore';
import { useToast } from '@/components/ui/toast';

type PartnerTabKey = 'services' | 'portfolio' | 'reviews';

export default function PartnerProfileClient({ username }: { username: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PartnerTabKey>('services');
  const { showToast } = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.user);
  const openPanel = useChatUiStore((s) => s.openPanel);
  const [isChatLoading, setIsChatLoading] = useState(false);
  // Jadwal pindah dari kartu inline yang selalu terbuka → tombol "Jam
  // Operasional" di header yang membuka modal (pola sama dgn detail layanan).
  const [showSchedule, setShowSchedule] = useState(false);

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

  // Mitra yang membuka profilnya sendiri tidak boleh chat/pesan ke diri sendiri
  // (backend menolak SELF_ORDER / cannot chat with yourself) . bilah aksi
  // sticky di bawah disembunyikan untuknya, sama seperti tombol di ProfileHeader.
  const isOwnProfile = !!currentUser?.id && currentUser.id === profile.user_id;

  // Perilaku SAMA dengan handleChat di ProfileHeader: butuh login, buka panel
  // chat di desktop, pindah halaman room di mobile.
  const handleChat = async () => {
    if (!isAuthenticated) {
      showToast('Silakan login terlebih dahulu untuk memulai chat.', 'info');
      router.push('/login');
      return;
    }
    setIsChatLoading(true);
    try {
      const res = await fetchAPI<{ room_id: string }>('/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({ partner_id: profile.user_id }),
      });
      if (res.success && res.data?.room_id) {
        track('public_partner_chat_started', { partner_username: profile.username ?? null });
        if (window.matchMedia('(min-width: 1024px)').matches) {
          openPanel(res.data.room_id);
        } else {
          router.push(`/chat/${res.data.room_id}`);
        }
      } else {
        showToast('Gagal memulai obrolan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat memulai obrolan', 'error');
    } finally {
      setIsChatLoading(false);
    }
  };

  // Tab hanya dirender bila isinya ada . tab buntu (portofolio kosong, mitra
  // tanpa ulasan) lebih membingungkan daripada tidak ada tabnya sama sekali.
  // Portofolio tetap tampil SELAMA masih dimuat supaya tidak berkedip
  // muncul-hilang begitu datanya tiba.
  const reviewCount = reviewData?.summary?.total_reviews ?? 0;
  const portfolioCount = portfolios?.length ?? 0;
  const visibleTabs = [
    {
      key: 'services' as const,
      label: 'Layanan',
      icon: LayoutGrid,
      count: isServicesLoading ? null : (services?.length ?? 0),
    },
    ...(isPortfoliosLoading || portfolioCount > 0
      ? [{
          key: 'portfolio' as const,
          label: 'Portofolio',
          icon: Images,
          count: isPortfoliosLoading ? null : portfolioCount,
        }]
      : []),
    ...(reviewCount > 0
      ? [{ key: 'reviews' as const, label: 'Ulasan', icon: Star, count: reviewCount }]
      : []),
  ];
  // Tab aktif bisa LENYAP setelah datanya tiba (mis. portofolio ternyata
  // kosong). Jatuhkan ke tab pertama alih-alih merender panel kosong tanpa tab
  // yang menyala.
  const activeTabKey: PartnerTabKey = visibleTabs.some((t) => t.key === activeTab)
    ? activeTab
    : 'services';

  return (
    // pb-28 di bawah lg = ruang untuk bilah aksi sticky (FEATURE #11);
    // StickyActionBar default lg:hidden, jadi lg kembali ke padding biasa.
    // Profil sendiri tidak punya bilahnya . padding lamanya dipertahankan.
    <div
      className={
        isOwnProfile
          ? 'page-h bg-brand-gray-60 pb-20 sm:pb-12'
          : 'page-h bg-brand-gray-60 pb-28 lg:pb-12'
      }
    >
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-3 sm:pt-8">
        <ProfileHeader
          profile={profile}
          onOpenSchedule={workingHours && workingHours.length > 0 ? () => setShowSchedule(true) : undefined}
        />

        <div className="mt-3 sm:mt-6">
          {/* Main Content (Full Width) */}
          <div className="space-y-3 sm:space-y-6">
            {/* Responsivitas + jaminan transaksi, DI ATAS kartu tab.

                Dulu keduanya kartu terpisah di BAWAH panel tab. Panel itu bisa
                sangat panjang (grid portofolio puluhan foto, daftar ulasan yang
                bisa dimuat terus) . jadi peringatan "jangan bayar di luar
                platform" praktis tak pernah terbaca, dan sejak Ulasan jadi tab
                (2026-08-20) posisinya makin jauh. Digabung jadi SATU kartu supaya
                naiknya ke atas tidak mendorong tab terlalu jauh dari lipatan.

                Blok responsivitas (E9) tetap hanya muncul bila backend mengirim
                response_stats (sampel cukup) . mitra baru tidak ditampilkan "0%". */}
            <div className="bg-white rounded-md shadow-sm p-4 sm:p-5 space-y-3">
              {profile.response_stats && (
                <div className="flex flex-wrap gap-2 pb-3 border-b border-brand-gray-100">
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
              )}
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-brand-info mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-brand-info-dark mb-0.5">Harga Transparan</p>
                  <p className="text-xs text-brand-gray-700 leading-snug">
                    Harga yang tertera adalah biaya layanan dasar. Biaya material atau peralatan tambahan, jika dibutuhkan, akan diajukan secara terpisah oleh mitra dan <strong>harus kamu setujui sebelum dibayar</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 pt-3 border-t border-brand-gray-100">
                <AlertTriangle className="w-4 h-4 text-brand-warning mt-0.5 shrink-0" />
                <p className="text-xs text-brand-warning-dark leading-snug">
                  <strong>Jangan bayar di luar platform.</strong> Semua transaksi harus melalui Posko Jasa agar dananya dilindungi Posko dan bergaransi layanan.
                </p>
              </div>
            </div>

            {/* Tabs: Layanan / Portofolio / Ulasan . tab garis-bawah berikon +
                jumlah item, disamakan dengan aplikasi Android (keputusan user
                2026-08-20). Ulasan kini SALAH SATU tab, bukan section terpisah
                jauh di bawah halaman.

                Tab hanya dirender bila isinya ada: portofolio kosong dan mitra
                tanpa ulasan tidak menampilkan tab buntu. Selama portofolio masih
                dimuat tabnya tetap tampil supaya tidak berkedip muncul-hilang.

                Semantik tab dipertahankan (audit D8): role/aria-selected supaya
                pembaca layar tahu ketiganya satu grup dan mana yang aktif. */}
            <div id="services-tabs" className="bg-white rounded-md shadow-sm">
              <div
                className="flex border-b border-brand-gray-100"
                role="tablist"
                aria-label="Konten mitra"
              >
                {visibleTabs.map((tab) => {
                  const active = activeTabKey === tab.key;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      id={`tab-${tab.key}`}
                      aria-selected={active}
                      aria-controls="partner-tabpanel"
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-[13px] sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-red ${active
                        ? 'border-brand-red text-brand-red'
                        : 'border-transparent text-brand-gray-450 hover:text-brand-gray-900'
                        }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {tab.label}
                      {tab.count !== null && tab.count > 0 && (
                        <span className="tabular-nums">{tab.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div
                className="p-3 sm:p-6"
                role="tabpanel"
                id="partner-tabpanel"
                aria-labelledby={`tab-${activeTabKey}`}
              >
                {activeTabKey === 'services' && (
                  <ServicesList services={services || []} profile={profile} isLoading={isServicesLoading} />
                )}
                {activeTabKey === 'portfolio' && (
                  <PortfolioGrid portfolios={portfolios || []} isLoading={isPortfoliosLoading} />
                )}
                {activeTabKey === 'reviews' && (
                  <ReviewSection
                    reviews={reviewData?.reviews || []}
                    summary={reviewData?.summary || { total_reviews: 0, avg_rating: 0, count_5: 0, count_4: 0, count_3: 0, count_2: 0, count_1: 0 }}
                    bare
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
                )}
              </div>
            </div>

            {/* Ulasan TIDAK lagi berdiri sebagai section terpisah di sini . ia
                sudah jadi salah satu tab di atas. Mitra tanpa ulasan pun tak
                menyisakan blok "Belum ada ulasan" yang memanjangkan halaman. */}
          </div>
        </div>
      </div>

      {/* FEATURE #11: bilah aksi sticky mobile (< lg). BottomNav sudah
          disembunyikan di profil mitra (isPartnerProfilePath di BottomNav),
          jadi bilah ini tidak bertumpuk dengannya . konsisten dengan pola
          detail /services/. */}
      {!isOwnProfile && (
        <StickyActionBar contentClassName="max-w-4xl">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleChat}
            isLoading={isChatLoading}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat
          </Button>
          {/* Tanpa track di sini: funnel booking sudah dicatat BookingClient
              (public_partner_booking_started) begitu halamannya terbuka. */}
          <Button className="flex-1" onClick={() => router.push(`/book/${username}`)}>
            Pesan
          </Button>
        </StickyActionBar>
      )}

      {/* Modal jam operasional . dipicu chip "Jam Operasional" di ProfileHeader.
          `bare` supaya judul tidak ganda dengan judul modal. */}
      <Modal open={showSchedule} onClose={() => setShowSchedule(false)} title="Jam Operasional">
        <ScheduleView workingHours={workingHours} isLoading={isHoursLoading} bare />
      </Modal>
    </div>
  );
}
