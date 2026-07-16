// Akses data wilayah Indonesia (provinsi/kota/kecamatan) untuk cascading dropdown.
// provinces + regencies kecil (~25KB) → import statis.
// districts lazy per-provinsi (dynamic import → code-split per provinsi).
import provincesData from '@/data/regions/provinces.json';
import regenciesData from '@/data/regions/regencies.json';

export interface Region {
  code: string;
  name: string;
}

const provinces = provincesData as Region[];
const regenciesByProv = regenciesData as Record<string, Region[]>;

// Cache hasil dynamic import districts per-provinsi.
const districtsCache = new Map<string, Record<string, Region[]>>();

export function getProvinces(): Region[] {
  return provinces;
}

export function getRegencies(provinceCode: string): Region[] {
  return regenciesByProv[provinceCode] ?? [];
}

export async function getDistricts(provinceCode: string, regencyCode: string): Promise<Region[]> {
  if (!provinceCode || !regencyCode) return [];
  let map = districtsCache.get(provinceCode);
  if (!map) {
    try {
      // Path relatif (bukan alias @/) agar webpack/turbopack membuat context
      // dynamic-import yang benar untuk seluruh file districts/*.json.
      const mod = await import(`../data/regions/districts/${provinceCode}.json`);
      map = (mod.default ?? mod) as Record<string, Region[]>;
      districtsCache.set(provinceCode, map);
    } catch {
      return [];
    }
  }
  return map[regencyCode] ?? [];
}

// ── Helper resolusi kode ⇄ nama ──────────────────────────────────────
// Form baru menyimpan NAMA (province/city/district). Saat edit alamat lama,
// kita perlu memetakan nama tersimpan kembali ke kode untuk prefill dropdown.

export function findProvinceByName(name?: string | null): Region | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  return provinces.find((p) => p.name.toLowerCase() === n);
}

export function findRegencyByName(provinceCode: string, name?: string | null): Region | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  return getRegencies(provinceCode).find((r) => r.name.toLowerCase() === n);
}
