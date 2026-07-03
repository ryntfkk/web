import Image from 'next/image';
import { MapPin, Star, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PartnerProfileData } from '@/hooks/usePartnerProfile';

interface ProfileHeaderProps {
  profile: PartnerProfileData;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
      <div className="relative w-20 h-20 sm:w-32 sm:h-32 shrink-0">
        <Image
          src={profile.avatar_url || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60'}
          alt={profile.name}
          fill
          className="object-cover rounded-full border-4 border-white shadow-md"
        />
        {profile.is_online && (
          <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>

      <div className="flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{profile.name}</h1>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
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
                  <span>{profile.avg_rating.toFixed(1)}</span>
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
            <Button className="flex-1 sm:flex-none">Pesan Sekarang</Button>
            <Button variant="secondary" className="flex-1 sm:flex-none bg-white border border-gray-200">Chat</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
