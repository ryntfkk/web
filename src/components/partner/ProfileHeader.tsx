import Image from 'next/image';
import { MapPin, Star, Clock, CheckCircle, BadgeCheck, Loader2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
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
      if (!res.success) showToast(res.message || 'Gagal mengubah favorit', 'error');
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

  return (
    <div className="bg-white rounded-md p-4 sm:p-6 shadow-sm mb-4 sm:mb-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
        <Image
          src={avatarUrl}
          alt={`${profile.name}${profile.service_area ? ` - mitra jasa di ${profile.service_area}` : ''}`}
          fill
          className="object-cover rounded-full border-4 border-white shadow-md"
          sizes="(max-width: 640px) 80px, 96px"
        />
        {profile.is_online && (
          <div className="absolute bottom-1 right-1 w-4 h-4 bg-brand-success rounded-full border-2 border-white" />
        )}
      </div>

      <div className="flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-brand-gray-900">{profile.name}</h1>
              {profile.is_verified && (
                <span className="bg-brand-info-soft text-brand-info-dark text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" /> Terverifikasi
                </span>
              )}
              {profile.is_online && (
                <span className="bg-brand-success-soft text-brand-success text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-brand-success rounded-full" /> Online
                </span>
              )}
              {/* Tanpa "+": angkanya pasti, dan "3+ Pesanan" adalah pembulatan
                  palsu yang melebih-lebihkan pengalaman mitra. */}
              {profile.total_orders > 0 && (
                <span className="bg-brand-red-light text-brand-red text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {profile.total_orders} Pesanan Selesai
                </span>
              )}
            </div>

            {/* Identitas badan usaha: yang menerima pembayaran bukan nama merek. */}
            {profile.partner_type === 'vendor' && profile.legal_name && (
              <p className="text-xs text-brand-gray-450 mb-2">
                Badan usaha: <span className="font-medium text-brand-gray-700">{profile.legal_name}</span>
              </p>
            )}

            {/* Bio . inline di bawah nama */}
            {typeof profile.bio === 'string' && profile.bio.trim().length > 0 && (
              <p className="text-sm text-brand-gray-700 leading-relaxed whitespace-pre-line mb-3 mt-1">
                {profile.bio}
              </p>
            )}

            <div className="flex items-center flex-wrap text-sm text-brand-gray-400 mb-3 gap-x-4 gap-y-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {profile.service_area || [profile.district, profile.city].filter(Boolean).join(', ') || 'Tidak ada area'}
              </span>
              {memberSince && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Bergabung {memberSince}
                </span>
              )}
            </div>

            {/* Spesialisasi diturunkan dari kategori layanan aktif . bukan klaim
                bebas yang diketik mitra. */}
            {!!profile.categories?.length && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {profile.categories.map((c) => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded-md bg-brand-gray-60 text-brand-gray-700 border border-brand-gray-100">
                    {c}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm mb-4">
              <div className="flex flex-col">
                {/* "0.0" berbintang emas terbaca "dinilai sangat buruk", bukan
                    "belum dinilai" (audit E6). */}
                {Number(profile.avg_rating) > 0 ? (
                  <>
                    <div className="flex items-center gap-1 text-brand-warning font-medium">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{Number(profile.avg_rating).toFixed(1)}</span>
                    </div>
                    <span className="text-brand-gray-400 text-xs">{profile.total_reviews} Ulasan</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-brand-gray-900">Baru</span>
                    <span className="text-brand-gray-400 text-xs">Belum ada ulasan</span>
                  </>
                )}
              </div>
              {/* Kolom "Pesanan" DIHAPUS: angkanya sudah jadi badge di baris nama
                  ("{n} Pesanan Selesai"), jadi blok ini cuma mengulanginya (E9). */}
              <div className="w-px h-8 bg-brand-gray-100" />
              <div className="flex flex-col">
                <span className="font-medium text-brand-gray-900">{profile.is_online ? 'Online' : 'Offline'}</span>
                <span className="text-brand-gray-400 text-xs">Status</span>
              </div>
            </div>

          </div>

          <div className="flex gap-2 w-full sm:w-auto sm:shrink-0">
            {isOwnProfile ? (
              <Button
                variant="secondary"
                className="flex-1 sm:flex-none bg-brand-red-light text-brand-gray-700 hover:bg-brand-gray-100"
                onClick={() => router.push('/mitra/dashboard')}
              >
                Kelola Profil
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  aria-label={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
                  onClick={handleFavToggle}
                  disabled={favBusy}
                  className={`flex-none px-3 ${isFav ? 'bg-brand-error-soft text-brand-red border border-brand-red hover:bg-brand-red-soft' : 'bg-brand-red-light text-brand-gray-700 hover:bg-brand-gray-100'}`}
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                  <span className="ml-1.5 sm:hidden">{isFav ? 'Tersimpan' : 'Favorit'}</span>
                </Button>
                <Button
                  className="flex-1 sm:flex-none bg-brand-red hover:bg-brand-red-dark text-white"
                  onClick={handleChat}
                  disabled={isChatLoading}
                >
                  {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Chat'}
                </Button>
              </>
            )}
          </div>
        </div>

        {!isOwnProfile && (
          <div className="mt-3 flex justify-end">
            <ReportDialog targetType="partner" targetId={profile.id} />
          </div>
        )}
      </div>
    </div>
  );
}
