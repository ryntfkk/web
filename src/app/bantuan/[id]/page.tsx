import SupportChat from '@/components/support/SupportChat';
import { safeInternalPath } from '@/lib/support';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function SupportThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  // `from` diisi saat thread dibuka dari halaman lain (mis. detail pesanan) agar
  // tombol kembali balik ke sana, bukan selalu ke kotak masuk. Kotak masuk tetap
  // fallback yang aman untuk deep-link/tanpa asal.
  const backHref = safeInternalPath(from) ?? '/bantuan';
  return <SupportChat reportId={id} backHref={backHref} inboxHref="/bantuan" />;
}
