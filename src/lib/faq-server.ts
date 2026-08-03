import { API_URL } from '@/lib/api';
import type { FaqGroup } from '@/hooks/useFaqs';
import { renderFaqAnswer } from '@/lib/faq-tokens';
import { FALLBACK_PLATFORM_CONFIG, type PlatformConfig } from '@/hooks/usePlatformConfig';

// Pengambil FAQ + setelan untuk Server Component.
//
// Kenapa perlu: setelah FAQ pindah ke DB (Fase 4), /help mengambilnya di klien
// sehingga HTML yang dikirim server TIDAK LAGI memuat teks FAQ sama sekali.
// Sebelum Fase 4, teks itu ada di JSX dan ikut ter-render. Itu regresi
// keterindeksan yang tidak disengaja — halaman bantuan justru halaman yang
// paling sering dicari lewat mesin pencari.
//
// Dengan mengambilnya di server, HTML kembali memuat isinya DAN kita bisa
// memancarkan JSON-LD FAQPage yang benar.

const SERVER_API = API_URL.startsWith('http') ? API_URL : 'https://api.poskojasa.com/api/v1';

async function getJSON<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_API}${path}`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as T) ?? null;
  } catch {
    return null;
  }
}

/**
 * FAQ dengan token {{...}} SUDAH diganti nilai nyata.
 *
 * Interpolasi dilakukan di server juga — kalau tidak, JSON-LD akan memuat
 * "{{platform_fee_rate}}" mentah dan itu yang terbaca mesin pencari.
 */
export async function getFaqsRendered(
  audience: 'CUSTOMER' | 'PARTNER',
): Promise<FaqGroup[]> {
  const [groups, config] = await Promise.all([
    getJSON<FaqGroup[]>(`/faqs?audience=${audience}`, 600),
    getJSON<PlatformConfig>('/config', 600),
  ]);
  if (!groups) return [];

  const cfg = config ?? FALLBACK_PLATFORM_CONFIG;
  return groups.map((g) => ({
    ...g,
    items: g.items.map((it) => ({ ...it, answer: renderFaqAnswer(it.answer, cfg) })),
  }));
}

/** Ratakan jadi daftar Q&A untuk JSON-LD FAQPage. */
export function flattenFaq(groups: FaqGroup[]): { q: string; a: string }[] {
  return groups.flatMap((g) => g.items.map((it) => ({ q: it.question, a: it.answer })));
}
