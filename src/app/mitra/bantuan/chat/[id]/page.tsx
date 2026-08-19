import SupportChat from '@/components/support/SupportChat';
import { safeInternalPath } from '@/lib/support';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function MitraSupportThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  // `from` diisi saat dibuka dari halaman lain (mis. detail pesanan mitra) agar
  // tombol kembali balik ke sana; kotak masuk mitra tetap fallback aman.
  const backHref = safeInternalPath(from) ?? '/mitra/bantuan/chat';
  // `h-[100dvh]` penuh: mode mitra tidak punya TopNavbar di breakpoint mana pun
  // (HeaderWrapper menepi untuk /mitra), dan rute ini masuk `isExcludedFlow` di
  // MitraLayoutClient sehingga MitraBottomNav pun disembunyikan. Tidak ada apa
  // pun yang perlu dikurangi dari tinggi layar.
  return <SupportChat reportId={id} backHref={backHref} inboxHref="/mitra/bantuan/chat" heightClass="h-[100dvh]" />;
}
