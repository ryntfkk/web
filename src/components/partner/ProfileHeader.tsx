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
    <div className="bg-white rounded p-4 sm:p-6 shadow-sm mb-4 sm:mb-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
      <div className="relative w-20 h-20 sm:w-32 sm:h-32 shrink-0">
        <Image
          src={avatarUrl}
          alt={profile.name}
          fill
          className="object-cover rounded border-4 border-white shadow-md"
        />
        {profile.is_online && (
          <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded border-2 border-white" />
        )}
      </div>

      <div className="flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{profile.name}</h1>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Terverifikasi
              </span>
            </div>
            
            <div className="flex items-center text-sm text-gray-500 mb-3 gap-1">
              <MapPin className="w-4 h-4" />
              <span>{profile.service_area || 'Tidak ada area'}</span>
            </div>

            <div className="flex items-center gap-4 text-sm mb-4 sm:mb-0">
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-yellow-500 font-medium">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{Number(profile.avg_rating).toFixed(1)}</span>
                </div>
                <span className="text-gray-500 text-xs">{profile.total_reviews} Ulasan</span>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">{profile.total_orders}</span>
                <span className="text-gray-500 text-xs">Pesanan</span>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">Aktif</span>
                <span className="text-gray-500 text-xs">2 Tahun</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              className="flex-1 sm:flex-none"
              onClick={() => {
                document.getElementById('services-tabs')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Pesan Sekarang
            </Button>
            <Button 
              variant="secondary" 
              className="flex-1 sm:flex-none bg-white border border-gray-200"
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
