/**
 * Bentuk kanonik nomor HP Indonesia . CERMIN `utils.NormalizePhone` di backend
 * (internal/utils/phone.go). Aturannya sama persis; kalau yang di Go berubah,
 * ubah juga di sini (dan sebaliknya).
 *
 * Kenapa ada di klien padahal server sudah mengkanonkan (F3, audit 2026-08-21):
 * bukan soal kebenaran data . itu urusan server . melainkan UMPAN BALIK. Tanpa
 * ini, pengguna mengetik "0812…", melihat "0812…" di layar, lalu menerima OTP
 * dan pesan galat yang menyebut "62812…". Nomor yang ditampilkan aplikasi
 * seharusnya nomor yang sama dengan yang diproses.
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

/**
 * Tampilan ramah untuk nomor kanonik: `62812…` → `+62 812-…`.
 * Dipakai untuk MENAMPILKAN, bukan untuk dikirim ke API.
 */
export function formatPhoneDisplay(canonical: string): string {
  const d = canonical.replace(/\D/g, '');
  if (!d.startsWith('62') || d.length < 5) return canonical;
  const sisa = d.slice(2);
  const bagian = [sisa.slice(0, 3), sisa.slice(3, 7), sisa.slice(7)].filter(Boolean);
  return `+62 ${bagian.join('-')}`;
}
