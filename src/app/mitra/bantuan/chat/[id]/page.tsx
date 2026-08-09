import SupportChat from '@/components/support/SupportChat';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function MitraSupportThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // `h-[100dvh]` penuh: mode mitra tidak punya TopNavbar di breakpoint mana pun
  // (HeaderWrapper menepi untuk /mitra), dan rute ini masuk `isExcludedFlow` di
  // MitraLayoutClient sehingga MitraBottomNav pun disembunyikan. Tidak ada apa
  // pun yang perlu dikurangi dari tinggi layar.
  return <SupportChat reportId={id} backHref="/mitra/bantuan/chat" heightClass="h-[100dvh]" />;
}
