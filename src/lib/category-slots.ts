/**
 * Aturan slot kategori mitra di sisi web (backend migrasi 000080).
 *
 * Dipisah dari komponen wizard supaya bisa diuji tanpa merender form enam
 * langkah . dan supaya kuota tidak ditulis ulang di dua tempat.
 *
 * Semua aturan di sini juga ditegakkan server. Yang ada di web hanya mencegah
 * pemohon mengisi seluruh form lalu ditolak setelah mengunggah 25 foto; ia
 * BUKAN pengaman.
 */

export type PartnerTypeSlug = 'individual' | 'vendor';

export type StepKeyName = 'type' | 'business' | 'identity' | 'profile' | 'expertise' | 'location' | 'bank';

/**
 * Kuota BASE menurut tipe mitra. Slot tambahan hanya lahir dari permintaan yang
 * disetujui admin, jadi tak mungkin sudah ada saat orang mendaftar.
 *
 * Angkanya menyalin default `platform_settings.category_slots_*`. Admin bisa
 * menaikkannya tanpa deploy; salinan di sini hanya dipakai wizard pendaftaran,
 * dan server tetap yang memutuskan.
 */
export function categoryQuotaFor(type: PartnerTypeSlug): number {
  return type === 'vendor' ? 3 : 1;
}

export interface ExpertiseRow {
  category_id: string;
  files: File[];
}

/**
 * Langkah "Keahlian" sah bila:
 *  - pemohon memilih 1..kuota kategori DAN setiap kategori membawa fotonya
 *    sendiri (foto kompresor AC tidak membuktikan klaim "Wedding Organizer"); ATAU
 *  - ia tidak menyentuhnya sama sekali PADAHAL sudah punya kategori lama
 *    (pengajuan ulang). Payload tanpa `main_categories` berarti "pertahankan",
 *    jadi memaksanya memotret ulang seluruh alat hanya karena alamat
 *    basecamp-nya ditolak adalah hukuman tanpa alasan.
 */
export function expertiseStepValid({
  picked,
  quota,
  keptCount,
}: {
  picked: ExpertiseRow[];
  quota: number;
  keptCount: number;
}): boolean {
  if (picked.length === 0) return keptCount > 0;
  if (picked.length > quota) return false;
  return picked.every((row) => !!row.category_id && row.files.length > 0);
}

/**
 * Urutan langkah wizard. `type` hanya ada di pendaftaran BARU: mengubah tipe
 * mitra berarti mengganti subjek hukum kontrak, dan endpoint pengajuan ulang
 * memang tidak menerimanya.
 */
export function stepsForPartner(type: PartnerTypeSlug, isReverify: boolean): StepKeyName[] {
  const base: StepKeyName[] = isReverify ? [] : ['type'];
  if (type === 'vendor') {
    return [...base, 'business', 'identity', 'profile', 'expertise', 'location', 'bank'];
  }
  return [...base, 'identity', 'profile', 'expertise', 'location', 'bank'];
}
