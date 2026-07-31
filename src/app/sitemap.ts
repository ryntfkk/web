import type { MetadataRoute } from 'next';
import { slugify } from '@/lib/slug';

// SE1: sitemap dinamis. Statis + kategori + landing lokal /jasa/[kat]/[kota]
// (HANYA kombinasi yang punya layanan → hindari soft-404) + detail layanan.
// Di-revalidate tiap jam. Fetch defensif: bila API gagal saat build, tetap
// kembalikan halaman statis (jangan gagalkan build Amplify).
export const revalidate = 3600;

const BASE = 'https://poskojasa.com';
const API = 'https://api.poskojasa.com/api/v1';

type ServiceRow = { id: string; updated_at?: string; category_id?: string; partner_city?: string };
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

  // Peta kategori: id → slug, dan id-sub → slug induk (untuk kombinasi /jasa).
  const slugById = new Map<string, string>();
  const parentSlugById = new Map<string, string>();
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const mains = (await fetchJSON<CatRow[]>('/categories')) ?? [];
    for (const m of mains) if (m.slug) slugById.set(m.id, m.slug);
    const grouped = await Promise.all(
      mains.map((m) =>
        fetchJSON<CatRow[]>(`/categories/${m.id}/subcategories`).then((subs) => ({ main: m, subs: subs ?? [] })),
      ),
    );
    const allSubs: CatRow[] = [];
    for (const { main, subs } of grouped) {
      for (const sub of subs) {
        if (sub.slug) {
          slugById.set(sub.id, sub.slug);
          if (main.slug) parentSlugById.set(sub.id, main.slug);
        }
        allSubs.push(sub);
      }
    }
    categoryPages = [...mains, ...allSubs]
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

  // Layanan (paginasi fetch) → detail /services/[id] + kombinasi lokal /jasa.
  // Sebelumnya hardcode limit=1000 → terpotong bila layanan > 1000. Kini fetch
  // bertahap (PAGE_SIZE per halaman) sampai habis atau cap SITEMAP_MAX_SERVICES
  // (batas aman Google: 50k URL per sitemap, tapi kita batasi lebih rendah agar
  // sitemap tidak terlalu besar untuk di-build).
  let servicePages: MetadataRoute.Sitemap = [];
  const jasaCombos = new Set<string>(); // key: "catSlug|citySlug"
  const SITEMAP_PAGE_SIZE = 500;
  const SITEMAP_MAX_SERVICES = 10000;
  try {
    const rows: ServiceRow[] = [];
    let offset = 0;
    while (offset < SITEMAP_MAX_SERVICES) {
      const batch = await fetchJSON<ServiceRow[]>(
        `/services?limit=${SITEMAP_PAGE_SIZE}&offset=${offset}`,
      );
      if (!batch || batch.length === 0) break;
      rows.push(...batch);
      if (batch.length < SITEMAP_PAGE_SIZE) break; // halaman terakhir
      offset += SITEMAP_PAGE_SIZE;
    }
    servicePages = rows
      .filter((s) => s && s.id)
      .map((s) => ({
        url: `${BASE}/services/${s.id}`,
        lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }));

    for (const s of rows) {
      if (!s.category_id || !s.partner_city) continue;
      const citySlug = slugify(s.partner_city);
      if (!citySlug) continue;
      // Slug kategori langsung (sub/utama) + slug induk (filter hierarki
      // menampilkan layanan sub di halaman kategori utama juga).
      const catSlug = slugById.get(s.category_id);
      if (catSlug) jasaCombos.add(`${catSlug}|${citySlug}`);
      const parentSlug = parentSlugById.get(s.category_id);
      if (parentSlug) jasaCombos.add(`${parentSlug}|${citySlug}`);
    }
  } catch {
    // API tak tersedia saat build — cukup halaman statis.
  }

  const localPages: MetadataRoute.Sitemap = [...jasaCombos].map((key) => {
    const [catSlug, citySlug] = key.split('|');
    return {
      url: `${BASE}/jasa/${catSlug}/${citySlug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    };
  });

  return [...staticPages, ...categoryPages, ...localPages, ...servicePages];
}
