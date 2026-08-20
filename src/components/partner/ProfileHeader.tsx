import Image from 'next/image';
import { MapPin, Star, Clock, BadgeCheck, Loader2, UserPlus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCompactNumber } from '@/lib/format';
import { PartnerProfileData } from '@/hooks/usePartnerProfile';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { track } from '@/lib/analytics';
import { useAuthStore } from '@/lib/store/authStore';
import { useChatUiStore } from '@/lib/store/chatUiStore';
import { useFavoritePartners, useFavoritesActions } from '@/hooks/useFavorites';
import { useToast } from '@/components/ui/toast';
import ReportDialog from '@/components/ReportDialog';
import { PLACEHOLDER_AVATAR as DEFAULT_AVATAR } from '@/lib/images';

interface ProfileHeaderProps {
  profile: PartnerProfileData;
  /** Buka modal jam operasional (dipicu chip "Jam Operasional" di kartu ini). */
  onOpenSchedule?: () => void;
}

export default function ProfileHeader({ profile, onOpenSchedule }: ProfileHeaderProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isChatLoading, setIsChatLoading] = useState(false);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const currentUser = useAuthStore(state => state.user);
  const openPanel = useChatUiStore((s) => s.openPanel);
  // Mitra yang membuka profilnya sendiri tidak boleh chat/lapor/pesan ke diri
  // sendiri . backend menolaknya (SELF_ORDER / cannot chat with yourself).
  const isOwnProfile = !!currentUser?.id && currentUser.id === profile.user_id;

  // Favorit mitra. partner_id memakai partners.id (= profile.id), bukan user_id.
  const { data: favPartners } = useFavoritePartners();
  const { addPartner, removePartner } = useFavoritesActions();
  const [favBusy, setFavBusy] = useState(false);
  const isFav = !!favPartners?.some((f) => f.partner_id === profile.id);
  const [bioExpanded, setBioExpanded] = useState(false);

  const handleFavToggle = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/${profile.username}`)}`);
      return;
    }
    if (favBusy) return;
    setFavBusy(true);
    try {
      const res = isFav
        ? await removePartner(profile.id)
        : await addPartner(profile.id);
      if (!res.success) showToast(res.message || 'Gagal memperbarui status ikuti', 'error');
    } finally {
      setFavBusy(false);
    }
  };

  // "Bergabung" = tanggal mitra DISETUJUI. Backend mengosongkannya untuk mitra
  // lama yang tak punya verified_at; jangan mengarang dari tanggal akun.
  const memberSince =
    profile.member_since && !isNaN(Date.parse(profile.member_since))
      ? new Date(profile.member_since).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      : null;

  // Provide a proper fallback for avatar - handle any non-string value safely
  const avatarUrl = typeof profile.avatar_url === 'string' && profile.avatar_url.length > 0
    ? profile.avatar_url
    : DEFAULT_AVATAR;

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
    } catch (error) {
      console.error('Error creating chat room:', error);
      showToast('Terjadi kesalahan saat memulai obrolan', 'error');
    } finally {
      setIsChatLoading(false);
    }
  };

  const locationLabel =
    profile.service_area ||
    [profile.district, profile.city].filter(Boolean).join(', ') ||
    '';

  const ratingValue = Number(profile.avg_rating);
  const hasRating = ratingValue > 0;

  return (
    <div className="bg-white rounded-md p-4 sm:p-6 shadow-sm mb-3 sm:mb-6">
      {/* Baris atas ala Instagram: avatar + tiga statistik (Pesanan/Ulasan/
          Rating). Statistik yang dulu terselip di baris terpisah kini jadi
          ringkasan sekilas di sebelah avatar. */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="relative w-[72px] h-[72px] sm:w-24 sm:h-24 shrink-0">
          <Image
            src={avatarUrl}
            alt={`${profile.name}${profile.service_area ? ` - mitra jasa di ${profile.service_area}` : ''}`}
            fill
            className="object-cover rounded-full border-2 sm:border-4 border-white shadow-md ring-1 ring-brand-gray-100"
            sizes="(max-width: 640px) 72px, 96px"
          />
          {/* Titik hijau di avatar DIHAPUS: status kehadiran sekarang punya
              badge eksplisit di sebelah nama, dan dua penanda untuk satu fakta
              yang sama hanya menambah bunyi. */}
        </div>

        {/* Trio statistik = Rating · Pengikut · Pesanan (keputusan user
            2026-08-20, disamakan dengan aplikasi Android). "Ulasan" keluar dari
            sini karena jumlahnya sudah tampil sebagai konteks di sebelah handle
            dan sebagai angka di tab Ulasan . rating yang tidak punya tempat lain
            sepenting ini. */}
        <div className="flex-1 grid grid-cols-3 text-center">
          <div>
            {/* "0.0" berbintang emas terbaca "dinilai buruk", bukan "belum
                dinilai" (audit E6) . mitra tanpa rating tampil "–". */}
            <div className="flex items-center justify-center gap-1 text-[17px] sm:text-xl font-bold text-brand-gray-900 leading-none tabular-nums">
              {hasRating && <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-brand-warning text-brand-warning" />}
              {hasRating ? ratingValue.toFixed(1) : '–'}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-brand-gray-450">Rating</div>
          </div>
          <div>
            <div className="text-[17px] sm:text-xl font-bold text-brand-gray-900 leading-none tabular-nums">
              {formatCompactNumber(profile.total_followers ?? 0)}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-brand-gray-450">Pengikut</div>
          </div>
          <div>
            <div className="text-[17px] sm:text-xl font-bold text-brand-gray-900 leading-none tabular-nums">
              {formatCompactNumber(profile.total_orders)}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-brand-gray-450">Pesanan</div>
          </div>
        </div>
      </div>

      {/* Identitas: nama + centang biru (ikon saja di mobile) + handle. */}
      <div className="mt-3.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h1 className="text-[15px] sm:text-lg font-bold text-brand-gray-900 leading-tight break-words min-w-0">{profile.name}</h1>
          {/* Badge KYC (model mitra instan): HANYA badge positif. `=== true`
              tampil centang; `false`/`undefined` tidak merender apa-apa . badge
              "Belum Terverifikasi" DIHAPUS atas keputusan user (2026-08-15).
              Di mobile: ikon segel biru saja (tanpa tulisan, ala Instagram);
              teks "Terverifikasi" hanya muncul sejak sm. */}
          {profile.is_verified === true && (
            <span className="inline-flex items-center gap-1 shrink-0" title="Terverifikasi">
              <BadgeCheck className="w-[18px] h-[18px] fill-brand-info text-white" aria-label="Terverifikasi" />
              <span className="hidden sm:inline text-[12px] font-medium text-brand-info-dark">Terverifikasi</span>
            </span>
          )}
          {/* Status kehadiran = badge tersendiri di sebelah nama. DULU ia item
              ketiga di baris meta bersama lokasi & "Sejak …" . berdampingan
              dengan kota, "Online" terbaca seperti bagian dari keterangan
              lokasi, bukan status mitranya. */}
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
              profile.is_online
                ? 'bg-brand-success-soft text-brand-success-dark'
                : 'bg-brand-gray-60 text-brand-gray-450'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${profile.is_online ? 'bg-brand-success' : 'bg-brand-gray-400'}`} />
            {profile.is_online ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Handle publik mitra. URL profil = /{username}, jadi handle ini yang
            dikenali & dibagikan pelanggan . dulu tidak pernah tampil. */}
        {profile.username && (
          <p className="text-[12px] sm:text-[13px] text-brand-gray-450 mt-0.5 truncate">
            @{profile.username}
            {/* Jumlah ulasan ikut di sini setelah keluar dari trio statistik .
                konteks yang membedakan "5,0 dari 1 ulasan" dengan "4,8 dari 500". */}
            {profile.total_reviews > 0 && ` · ${formatCompactNumber(profile.total_reviews)} ulasan`}
          </p>
        )}

        {/* Identitas badan usaha: yang menerima pembayaran bukan nama merek. */}
        {profile.partner_type === 'vendor' && profile.legal_name && (
          <p className="text-[11px] sm:text-xs text-brand-gray-450 mt-1">
            Badan usaha: <span className="font-medium text-brand-gray-700">{profile.legal_name}</span>
          </p>
        )}

        {/* Bio . lebar penuh (ala caption profil IG), dipotong 3 baris sampai
            dibuka. Tanpa potongan, bio panjang mendorong tab & daftar layanan
            jauh ke bawah lipatan . justru bagian yang dicari pengunjung. */}
        {typeof profile.bio === 'string' && profile.bio.trim().length > 0 && (
          <div className="mt-2">
            <p
              className={`text-[13px] sm:text-sm text-brand-gray-700 leading-relaxed whitespace-pre-line ${
                bioExpanded ? '' : 'line-clamp-3'
              }`}
            >
              {profile.bio}
            </p>
            {!bioExpanded && profile.bio.trim().length > 120 && (
              <button
                type="button"
                onClick={() => setBioExpanded(true)}
                className="mt-0.5 text-[12px] font-semibold text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red rounded"
              >
                Selengkapnya
              </button>
            )}
          </div>
        )}

        {/* Spesialisasi diturunkan dari kategori layanan aktif . bukan klaim
            bebas yang diketik mitra. */}
        {!!profile.categories?.length && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {profile.categories.map((c) => (
              <span key={c} className="text-[11px] px-2 py-0.5 rounded-md bg-brand-gray-60 text-brand-gray-700 border border-brand-gray-100">
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Meta sekunder: lokasi · bergabung · status (rating/pesanan sudah di
            baris statistik atas, jadi tak diulang di sini). */}
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-brand-gray-450 ${locationLabel || memberSince ? 'mt-2.5' : ''}`}>
          {locationLabel && (
            <span className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{locationLabel}</span>
            </span>
          )}
          {memberSince && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Sejak {memberSince}
            </span>
          )}
        </div>
      </div>

      {/* Baris tombol ala IG: lebar penuh di mobile. Ikuti + Jam Operasional
          selalu; Chat/Pesan hanya desktop (lg) . di bawah lg ada
          StickyActionBar. */}
      <div className="mt-4 flex items-center gap-2">
        {isOwnProfile ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 lg:flex-none"
            onClick={() => router.push('/mitra/dashboard')}
          >
            Kelola Profil
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              aria-pressed={isFav}
              className="flex-1 lg:flex-none"
              onClick={handleFavToggle}
              disabled={favBusy}
            >
              {isFav ? (
                <UserCheck className="w-4 h-4 mr-1.5 text-brand-red" />
              ) : (
                <UserPlus className="w-4 h-4 mr-1.5" />
              )}
              {isFav ? 'Mengikuti' : 'Ikuti'}
            </Button>
            {/* Jam Operasional hanya dirender bila mitra PUNYA jam kerja
                (parent mengoper onOpenSchedule hanya saat begitu) . tanpa itu
                tombolnya buntu ke modal "belum ditentukan". */}
            {onOpenSchedule && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 lg:flex-none"
                onClick={onOpenSchedule}
              >
                <Clock className="w-4 h-4 mr-1.5 text-brand-red" />
                Jam Operasional
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={handleChat}
              disabled={isChatLoading}
            >
              {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Chat'}
            </Button>
            {/* Desktop tak punya StickyActionBar (lg:hidden), jadi tanpa tombol
                ini pengguna desktop tak bisa memesan dari profil mitra. */}
            <Button
              size="sm"
              className="hidden lg:inline-flex"
              onClick={() => router.push(`/book/${profile.username}`)}
            >
              Pesan
            </Button>
          </>
        )}
      </div>

      {!isOwnProfile && (
        <div className="mt-2 flex justify-end">
          <ReportDialog targetType="partner" targetId={profile.id} />
        </div>
      )}
    </div>
  );
}
