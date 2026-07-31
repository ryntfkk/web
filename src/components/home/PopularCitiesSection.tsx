import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { slugify } from '@/lib/slug';
import type { Category } from '@/types/category';

// SE: Section "Jasa Populer per Kota" di home — bantu Google menemukan landing
// lokal /jasa/[kategori]/[kota] dari home (1 hop, bukan 2). Server Component agar
// link masuk HTML awal (kebaca crawler + LCP cepat). Fetch kategori utama + kota
// yang punya mitra, batasi 6 kategori × 6 kota = maks 36 chip.
export const revalidate = 300;

const SERVER_API = API_URL.startsWith('http') ? API_URL : 'https://api.poskojasa.com/api/v1';
const MAX_CATEGORIES = 6;
const MAX_CITIES = 6;

async function getJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_API}${path}`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as T) ?? null;
  } catch {
    return null;
  }
}

export default async function PopularCitiesSection() {
  const [categories, cities] = await Promise.all([
    getJSON<Category[]>('/categories'),
    getJSON<string[]>('/partners/cities'),
  ]);

  const mainCats = (categories ?? [])
    .filter((c) => !c.parent_id && c.slug && c.is_active)
    .slice(0, MAX_CATEGORIES);
  const cityList = (cities ?? []).filter(Boolean).slice(0, MAX_CITIES);

  if (mainCats.length === 0 || cityList.length === 0) return null;

  return (
    <section className="mb-6 md:mb-8">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red" />
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-brand-gray-900">
          Jasa Populer per Kota
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {mainCats.map((cat) =>
          cityList.map((city) => {
            const citySlug = slugify(city);
            if (!cat.slug || !citySlug) return null;
            const href = `/jasa/${cat.slug}/${citySlug}`;
            return (
              <Link
                key={`${cat.id}-${city}`}
                href={href}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-brand-gray-100 text-[13px] font-medium text-brand-gray-900 hover:border-brand-red hover:text-brand-red transition-colors"
              >
                {cat.name} {city}
              </Link>
            );
          }),
        )}
      </div>
    </section>
  );
}
