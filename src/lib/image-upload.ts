/**
 * Normalisasi gambar sebelum diunggah dari perangkat mitra.
 *
 * Masalah yang diselesaikan: HEIC/HEIF adalah format kamera DEFAULT iPhone.
 * Browser non-Safari tidak bisa men-decode-nya (pratinjau `<img>` kosong) dan
 * backend menolaknya (hanya JPG/PNG/WebP), sehingga foto dari iPhone gagal
 * diunggah dengan pesan "Format file tidak didukung". Solusinya: konversi ke
 * JPEG di sisi klien memakai libheif (via `heic2any`).
 *
 * `heic2any` (~beberapa ratus KB + WASM) di-`import()` DINAMIS . hanya dimuat
 * saat benar-benar ketemu file HEIC, jadi tidak membebani bundle mayoritas
 * pengguna (Android/desktop). File non-HEIC dikembalikan apa adanya.
 */

const HEIC_EXT = /\.(heic|heif)$/i;

// Selaras dengan batas backend (GetUploadURL / GetDocumentUploadURL): PUT ke S3
// ditandatangani dengan Content-Length, dan file_size > 5MB ditolak 400.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Deteksi HEIC/HEIF, termasuk kasus iOS yang mengirim `type` kosong. */
export function isHeic(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence'
  ) {
    return true;
  }
  // iOS kerap mengirim MIME kosong / octet-stream saat HEIC dipilih dari
  // aplikasi "Files" . jatuh ke ekstensi nama berkas.
  if (type === '' || type === 'application/octet-stream') {
    return HEIC_EXT.test(file.name);
  }
  return false;
}

/**
 * Kembalikan file yang siap diunggah:
 *  - HEIC/HEIF  → dikonversi ke JPEG (dan dikompres bila > 5MB).
 *  - lainnya    → tidak diubah.
 *
 * Melempar bila konversi gagal (mis. HEIC rusak) . pemanggil menampilkan pesan.
 */
export async function ensureUploadableImage(file: File): Promise<File> {
  if (!isHeic(file)) return file;

  const heic2any = (await import('heic2any')).default;
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
  // HEIC bisa memuat banyak gambar → heic2any mengembalikan Blob[]. Ambil yang
  // pertama (foto utama).
  let blob: Blob = Array.isArray(out) ? out[0] : out;

  // HEIC sangat padat; hasil JPEG-nya kerap > 5MB dan akan ditolak backend saat
  // PUT. Kompres ulang sampai muat supaya konversi tidak "berhasil lalu gagal".
  if (blob.size > MAX_UPLOAD_BYTES) {
    blob = await compressJpeg(blob, MAX_UPLOAD_BYTES);
  }

  const base = file.name.replace(HEIC_EXT, '').trim();
  return new File([blob], `${base || 'foto'}.jpg`, {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
}

/**
 * Kompres JPEG lewat canvas sampai <= `maxBytes`: turunkan kualitas dulu, lalu
 * dimensi. Dipakai hanya untuk hasil konversi HEIC yang kelewat besar.
 */
async function compressJpeg(blob: Blob, maxBytes: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    return blob;
  }

  let quality = 0.8;
  let scale = 1;
  let best = blob;

  for (let attempt = 0; attempt < 8; attempt++) {
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const encoded = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
    );
    if (encoded && encoded.size <= maxBytes) {
      bitmap.close?.();
      return encoded;
    }
    if (encoded) best = encoded;

    // Turunkan kualitas dulu (kualitas visual paling murah), baru kecilkan
    // dimensi setelah kualitas mentok.
    if (quality > 0.5) quality -= 0.15;
    else scale *= 0.8;
  }

  bitmap.close?.();
  return best;
}
