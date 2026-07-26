import type { MetadataRoute } from 'next';

// SE1: sitemap dinamis. Statis (halaman publik) + dinamis (detail layanan dari
// API). Di-revalidate tiap jam. Fetch defensif: bila API gagal saat build,
// tetap kembalikan halaman statis (jangan gagalkan build Amplify).
export const revalidate = 3600;

const BASE = 'https://poskojasa.com';
const API = 'https://api.poskojasa.com/api/v1';

type ServiceRow = { id: string; updated_at?: string };
type CatRow = { id: string; slug?: string | null };

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as T) ?? null;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    '',
    // '/services' kini halaman daftar layanan sungguhan (bukan lagi state kosong).
    '/services',
    '/categories',
    '/promos',
    '/about',
    '/help',
    '/privacy',
    '/terms',
  ].map((p) => ({
    url: BASE + p,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: p === '' ? 1 : 0.7,
  }));

  // Kategori (utama + sub) → /kategori/[slug]. Sumber halaman SEO taksonomi.
  let categories: MetadataRoute.Sitemap = [];
  try {
    const mains = (await fetchJSON<CatRow[]>('/categories')) ?? [];
    const subLists = await Promise.all(
      mains.map((m) => fetchJSON<CatRow[]>(`/categories/${m.id}/subcategories`)),
    );
    const all = [...mains, ...subLists.flatMap((s) => s ?? [])];
    categories = all
      .filter((c) => c && c.slug)
      .map((c) => ({
        url: `${BASE}/kategori/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
  } catch {
    // abaikan — cukup halaman lain.
  }

  let services: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API}/services?limit=1000`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = await res.json();
      const rows: ServiceRow[] = Array.isArray(json?.data) ? json.data : [];
      services = rows
        .filter((s) => s && s.id)
        .map((s) => ({
          // Route dinamis /services/[id] (URL bersih) — menggantikan ?id=.
          url: `${BASE}/services/${s.id}`,
          lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.8,
        }));
    }
  } catch {
    // API tak tersedia saat build — cukup halaman statis.
  }

  return [...staticPages, ...categories, ...services];
}
