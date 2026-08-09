"use client";

import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import SupportInbox from '@/components/support/SupportInbox';

// Kotak masuk CS DI DALAM shell mitra.
//
// Sebelum ini tombol "Chat Customer Service" di /mitra/bantuan mengarah ke
// /bantuan . kerangka pelanggan. Akibatnya mitra melihat TopNavbar pelanggan di
// desktop, MitraBottomNav sekaligus, dan tidak punya tombol kembali sama sekali
// karena MobilePageHeader default `lg:hidden`. Badannya tetap komponen yang
// sama; yang berpindah hanya kerangkanya.
export default function MitraSupportInboxPage() {
  return (
    <div className="pb-6">
      <MitraPageHeader
        title="Chat Customer Service"
        subtitle="Bantuan untuk akun mitra"
        variant="form"
        backHref="/mitra/bantuan"
        breadcrumbs={[
          { label: 'Profil', href: '/mitra/profile' },
          { label: 'Bantuan', href: '/mitra/bantuan' },
          { label: 'Chat CS' },
        ]}
      />

      <MitraPageContainer variant="form">
        <SupportInbox basePath="/mitra/bantuan/chat" />
      </MitraPageContainer>
    </div>
  );
}
