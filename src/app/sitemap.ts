import type { MetadataRoute } from 'next';

// SE1: sitemap dinamis. Statis (halaman publik) + dinamis (detail layanan dari
// API). Di-revalidate tiap jam. Fetch defensif: bila API gagal saat build,
// tetap kembalikan halaman statis (jangan gagalkan build Amplify).
export const revalidate = 3600;

const BASE = 'https://poskojasa.com';
const API = 'https://api.poskojasa.com/api/v1';

type ServiceRow = { id: string; updated_at?: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    '',
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
          url: `${BASE}/services?id=${s.id}`,
          lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.8,
        }));
    }
  } catch {
    // API tak tersedia saat build — cukup halaman statis.
  }

  return [...staticPages, ...services];
}
