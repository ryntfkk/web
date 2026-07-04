import { PartnerProfileData } from '@/hooks/usePartnerProfile';

interface AboutSectionProps {
  profile: PartnerProfileData;
}

export default function AboutSection({ profile }: AboutSectionProps) {
  const bioText = typeof profile.bio === 'string' && profile.bio.trim().length > 0
    ? profile.bio
    : 'Belum ada informasi tentang mitra ini.';

  return (
    <div className="bg-white rounded p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Tentang Saya</h2>
      <div className="text-gray-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
        {bioText}
      </div>
    </div>
  );
}
