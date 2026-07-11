import Image from 'next/image';
import { MapPin, Star, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PartnerProfileData } from '@/hooks/usePartnerProfile';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import ReportDialog from '@/components/ReportDialog';
import { PLACEHOLDER_AVATAR as DEFAULT_AVATAR } from '@/lib/images';

interface ProfileHeaderProps {
  profile: PartnerProfileData;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  const router = useRouter();
  const [isChatLoading, setIsChatLoading] = useState(false);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  // Provide a proper fallback for avatar - handle any non-string value safely
  const avatarUrl = typeof profile.avatar_url === 'string' && profile.avatar_url.length > 0
    ? profile.avatar_url
    : DEFAULT_AVATAR;

  const handleChat = async () => {
    if (!isAuthenticated) {
      alert('Silakan login terlebih dahulu untuk memulai chat.');
      router.push('/login');
      return;
    }

    setIsChatLoading(true);
    try {
      const res = await fetchAPI<any>('/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({ partner_id: profile.user_id }),
      });
      if (res.success && res.data?.room_id) {
        router.push(`/chat/${res.data.room_id}`);
      } else {
        alert('Gagal memulai obrolan');
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
      alert('Terjadi kesalahan saat memulai obrolan');
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-md p-4 sm:p-6 shadow-sm mb-4 sm:mb-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
      <div className="relative w-20 h-20 sm:w-32 sm:h-32 shrink-0">
        <Image
          src={avatarUrl}
          alt={profile.name}
          fill
          className="object-cover rounded-md border-4 border-white shadow-md"
        />
        {profile.is_online && (
          <div className="absolute bottom-1 right-1 w-4 h-4 bg-[#38A169] rounded-full border-2 border-white" />
        )}
      </div>

      <div className="flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-[#1c1b1b]">{profile.name}</h1>
              <span className="bg-[#f0eded] text-[#b51822] text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Terverifikasi
              </span>
            </div>

            {/* Bio — inline di bawah nama */}
            {typeof profile.bio === 'string' && profile.bio.trim().length > 0 && (
              <p className="text-sm text-[#5b403e] leading-relaxed whitespace-pre-line mb-3 mt-1">
                {profile.bio}
              </p>
            )}

            <div className="flex items-center text-sm text-[#8f6f6d] mb-3 gap-1">
              <MapPin className="w-4 h-4" />
              <span>{profile.service_area || 'Tidak ada area'}</span>
            </div>

            <div className="flex items-center gap-4 text-sm mb-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-[#D69E2E] font-medium">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{Number(profile.avg_rating).toFixed(1)}</span>
                </div>
                <span className="text-[#8f6f6d] text-xs">{profile.total_reviews} Ulasan</span>
              </div>
              <div className="w-px h-8 bg-[#e5e2e1]" />
              <div className="flex flex-col">
                <span className="font-medium text-[#1c1b1b]">{profile.total_orders}</span>
                <span className="text-[#8f6f6d] text-xs">Pesanan</span>
              </div>
              <div className="w-px h-8 bg-[#e5e2e1]" />
              <div className="flex flex-col">
                <span className="font-medium text-[#1c1b1b]">Aktif</span>
                <span className="text-[#8f6f6d] text-xs">2 Tahun</span>
              </div>
            </div>

          </div>

          <div className="flex gap-2 w-full sm:w-auto sm:shrink-0">
            <Button
              className="flex-1 sm:flex-none bg-[#b51822] hover:bg-[#90121a] text-white"
              onClick={handleChat}
              disabled={isChatLoading}
            >
              {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Chat'}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <ReportDialog targetType="partner" targetId={profile.id} />
        </div>
      </div>
    </div>
  );
}
