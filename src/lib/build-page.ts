import type { PlatformConfig } from '@/hooks/usePlatformConfig';
import { formatFeeRate } from '@/hooks/usePlatformConfig';
import { formatRupiah } from '@/lib/format';

/**
 * Isi halaman /build . "Build Posko With Us".
 *
 * Satu halaman untuk empat pembaca sekaligus: calon founding team, advisor,
 * partner, dan investor. Teksnya dipisah dari komponennya karena sebagian
 * dipakai dua kali (kartu peran di /build DAN halaman detail /build/[role]),
 * dan karena angkanya perlu satu tempat untuk diperbarui.
 *
 * DUA ATURAN YANG TIDAK BOLEH DILANGGAR DI BERKAS INI:
 *
 * 1. **Angka bisnis tidak ditulis sebagai literal.** Komisi dan pembagian
 *    hasil SELALU diturunkan dari PlatformConfig (`/config`), sama seperti
 *    /jadi-mitra. Halaman ini dibaca calon investor . angka komisi basi di
 *    sini bukan teks usang, melainkan keterangan yang salah kepada orang yang
 *    sedang mengambil keputusan uang.
 *
 * 2. **Angka traksi ditulis dengan tanggalnya.** `TRACTION_AS_OF` ikut tercetak
 *    di halaman. Metrik tanpa tanggal akan dibaca sebagai "hari ini" selamanya,
 *    dan itulah cara termudah membuat halaman jujur berubah menjadi klaim palsu
 *    tanpa ada yang menyunting satu huruf pun.
 */

/* ─────────── Kontak ─────────── */

/**
 * Tujuan SELURUH surat yang lahir dari /build . lamaran peran, percakapan
 * investor, maupun permintaan deck.
 *
 * SENGAJA alamat pribadi founder, BUKAN `profile.support_email` dari `/config`
 * yang dipakai sisa situs. Surat dari halaman ini tidak boleh masuk ke antrean
 * yang sama dengan keluhan pesanan: kotak masuk dukungan dibaca dengan mata
 * "selesaikan tiket", dan perkenalan calon tim atau investor yang masuk ke
 * sana akan diperlakukan sebagai tiket lalu ditutup.
 *
 * Konsekuensi yang disadari: (1) alamat ini terbit di halaman publik, jadi
 * akan dipanen pemanen alamat . itu harga yang diterima demi surat yang
 * sampai ke orang yang tepat; (2) berbeda dari angka bisnis di berkas ini,
 * alamat ini TIDAK bisa diubah dari panel admin . menggantinya berarti
 * menyunting baris ini lalu redeploy Amplify.
 *
 * SEMENTARA (2026-08-20). Begitu ada alamat perusahaan yang benar-benar
 * dibaca untuk keperluan ini, ganti konstanta ini . jangan menambah alamat
 * kedua di tempat pemakaian.
 */
export const BUILD_CONTACT_EMAIL = 'ryntfk@gmail.com';

/**
 * `mailto:` dengan subjek terisi sesuai konteks CTA-nya.
 *
 * Subjeknya bukan hiasan: ia yang membedakan lamaran Growth dari permintaan
 * deck investor di satu kotak masuk yang sama, tanpa perlu membuka isinya.
 */
export function contactHref(subject: string): string {
  return `mailto:${BUILD_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/* ─────────── Traksi ─────────── */

/**
 * Bulan berlakunya angka di bawah. Perbarui BERSAMAAN dengan angkanya .
 * jangan salah satu saja.
 */
export const TRACTION_AS_OF = 'Agustus 2026';

export interface Metric {
  label: string;
  value: string;
  /** Keterangan pendek di bawah angka. Boleh kosong. */
  note?: string;
}

/**
 * Ditulis "80+" dan "50+", bukan angka pasti, dan itu disengaja: angka
 * pastinya bergerak tiap hari sementara halaman ini di-cache. Pembulatan ke
 * bawah selalu bisa dipertahankan; angka pasti yang meleset ke atas tidak.
 */
export const HERO_METRICS: Metric[] = [
  { label: 'Users', value: '80+' },
  { label: 'Mitra Jasa', value: '50+' },
  { label: 'Launch Market', value: 'Semarang' },
  { label: 'Platform', value: 'Live' },
];

export const TODAY_METRICS: Metric[] = [
  { label: 'Registered Users', value: '80+', note: 'Pengguna terdaftar' },
  { label: 'Mitra', value: '50+', note: 'Penyedia jasa bergabung' },
  { label: 'Launch Market', value: 'Semarang', note: 'Kota pertama' },
  { label: 'Platform', value: 'Live', note: 'poskojasa.com' },
  { label: 'Stage', value: 'Early Stage', note: 'Baru dimulai' },
];

/* ─────────── Alur marketplace (Section 2) ─────────── */

export const MARKETPLACE_FLOW = [
  'Butuh Jasa',
  'Cari di Posko',
  'Bandingkan',
  'Pesan',
  'Bayar',
  'Review',
];

/* ─────────── Peran (Section 4) ─────────── */

export interface Role {
  /** Segmen URL: /build/<slug> */
  slug: string;
  title: string;
  /** Satu kalimat besar . dipakai di kartu maupun hero halaman detail. */
  headline: string;
  /** Isi kartu di /build. */
  summary: string;
  /** Bidang kerja . dicetak sebagai pill di kedua halaman. */
  focus: string[];
  /** Apa yang benar-benar dikerjakan di bulan-bulan pertama. */
  work: string[];
  /** Orang seperti apa yang dicari. Bukan daftar syarat kaku. */
  looking: string[];
}

export const ROLES: Role[] = [
  {
    slug: 'growth-marketing',
    title: 'Growth & Marketing',
    headline: 'Bikin Posko ditemukan lebih banyak orang.',
    summary:
      'Customer acquisition, campaign, partnership, community, dan growth experiment.',
    focus: ['Acquisition', 'Campaign', 'Community', 'Content', 'Growth Experiment'],
    work: [
      'Menentukan dari mana pengguna berikutnya datang . pencarian, komunitas, atau kanal yang belum pernah kami coba.',
      'Menjalankan eksperimen kecil beruntun, dan menghentikan yang tidak jalan tanpa menunggu satu kuartal.',
      'Membangun kanal konten dan sosial Posko dari nol, termasuk menentukan suaranya.',
      'Bekerja langsung dengan angka funnel: kunjungan, pendaftaran, pesanan pertama, pesanan berulang.',
    ],
    looking: [
      'Terbiasa menjalankan sendiri, bukan hanya merancang lalu menyerahkan.',
      'Nyaman dengan data mentah dan bisa menyimpulkan sendiri dari angka yang belum rapi.',
      'Punya rasa ingin tahu pada perilaku pengguna Indonesia, bukan sekadar praktik terbaik dari luar.',
    ],
  },
  {
    slug: 'marketplace-operations',
    title: 'Marketplace Operations',
    headline: 'Bikin supply dan demand Posko bekerja.',
    summary:
      'Mengelola mitra, kualitas layanan, kategori, wilayah, hingga pengalaman order.',
    focus: ['Supply', 'Kualitas', 'Kategori', 'Wilayah', 'Order Experience'],
    work: [
      'Merekrut dan mendampingi mitra baru sampai layanan pertamanya benar-benar bisa dipesan.',
      'Menjaga kualitas: menilai layanan yang tayang, menangani keluhan, memutuskan mana yang harus dicabut.',
      'Menentukan kategori dan wilayah mana yang dibuka berikutnya, berdasarkan permintaan yang terlihat.',
      'Menutup jarak antara apa yang dijanjikan halaman layanan dan apa yang diterima pelanggan.',
    ],
    looking: [
      'Mau turun langsung dan berbicara dengan mitra, bukan mengelola dari dasbor saja.',
      'Teliti pada detail yang membuat pesanan gagal . jam, harga, cakupan kerja, lokasi.',
      'Sabar menghadapi masalah yang berulang, dan memilih memperbaiki sistemnya alih-alih kasusnya saja.',
    ],
  },
  {
    slug: 'product-engineering',
    title: 'Product / Engineering',
    headline: 'Bangun produk yang dipakai jutaan orang.',
    summary:
      'Web, mobile, backend, marketplace system, payment, location, dan product experimentation.',
    focus: ['Web', 'Mobile', 'Backend', 'Payment', 'Location', 'Experimentation'],
    work: [
      'Mengerjakan produk yang sudah live dan dipakai . bukan proyek internal yang masih menunggu peluncuran.',
      'Menyentuh bagian yang memang sulit di marketplace: pencarian, jadwal, pembayaran, dan penyelesaian sengketa.',
      'Merilis kecil dan sering, lalu melihat sendiri akibatnya pada pengguna dan mitra.',
      'Ikut memutuskan apa yang dibangun, bukan menerima daftar tugas yang sudah jadi.',
    ],
    looking: [
      'Nyaman mengambil keputusan teknis tanpa menunggu semuanya pasti.',
      'Peduli pada pengalaman pengguna akhir, bukan hanya kerapian kode.',
      'Terbiasa dengan sistem yang berjalan di produksi beserta konsekuensinya.',
    ],
  },
  {
    slug: 'business-partnership',
    title: 'Business & Partnership',
    headline: 'Buka jalan Posko ke pasar yang lebih besar.',
    summary: 'Partnership, B2B, community, expansion, dan strategic collaboration.',
    focus: ['Partnership', 'B2B', 'Expansion', 'Community', 'Strategic Deals'],
    work: [
      'Membuka kerja sama dengan komunitas, asosiasi, dan penyedia jasa berskala lebih besar.',
      'Menguji permintaan B2B: kantor, properti, dan usaha yang butuh jasa berulang.',
      'Menyiapkan pembukaan kota berikutnya . dari pemetaan supply sampai mitra pertama.',
      'Membawa masukan pasar kembali ke produk dan operasi, bukan menyimpannya di pipeline.',
    ],
    looking: [
      'Bisa memulai percakapan dari nol tanpa nama besar di belakangnya.',
      'Paham bahwa kerja sama tahap awal dinilai dari transaksi yang jadi, bukan dari MoU.',
      'Mau ikut mengeksekusi kesepakatan yang dibuatnya sendiri.',
    ],
  },
];

export function findRole(slug: string): Role | undefined {
  return ROLES.find((r) => r.slug === slug);
}

/* ─────────── Bukan sekadar pekerjaan (Section 5) ─────────── */

export const OWNERSHIP_POINTS: Pillar[] = [
  { title: 'Ownership', body: 'Kerja dekat dengan founder dan ikut mengambil keputusan.' },
  { title: 'Build From Zero', body: 'Masalah yang dikerjakan masih benar-benar terbuka.' },
  { title: 'Real Impact', body: 'Apa yang kamu buat langsung dirasakan user dan mitra.' },
  { title: 'Early Opportunity', body: 'Kesempatan bergabung sebelum tim menjadi besar.' },
];

/* ─────────── Investor (Section 6) ─────────── */

export interface Pillar {
  title: string;
  body: string;
}

export const INVESTOR_PILLARS: Pillar[] = [
  {
    title: 'Massive Market',
    body: 'Hampir setiap orang membutuhkan jasa, mulai dari kebutuhan rumah, kendaraan, kecantikan, acara, hingga layanan profesional.',
  },
  {
    title: 'Fragmented Discovery',
    body: 'Penyedia jasa tersebar di sosial media, grup chat, marketplace umum, Google, dan offline.',
  },
  {
    title: 'Marketplace Opportunity',
    body: 'Posko membangun discovery, reputation, transaction, dan repeat order dalam satu platform.',
  },
];

/* ─────────── Why now (Section 7) ─────────── */

export const WHY_NOW: Pillar[] = [
  {
    title: 'Konsumen sudah terbiasa dengan marketplace',
    body: 'Orang Indonesia sudah terbiasa membandingkan harga, rating, dan review sebelum membeli.',
  },
  {
    title: 'Penyedia jasa semakin digital',
    body: 'UMKM dan penyedia jasa semakin bergantung pada internet untuk mendapatkan pelanggan.',
  },
  {
    title: 'Tetapi transaksi jasa masih terfragmentasi',
    body: 'Discovery sampai pembayaran belum memiliki pengalaman marketplace yang konsisten.',
  },
];

/* ─────────── Business model (Section 8) ─────────── */

export interface RevenueSplit {
  /** Contoh nilai pesanan . dipilih bulat supaya pembagiannya terbaca sekilas. */
  order: string;
  /** Bagian mitra. */
  partner: string;
  /** Bagian Posko. */
  posko: string;
  /** Komisi dalam persen, mis. "8%". */
  rate: string;
}

/**
 * Contoh pembagian hasil dari komisi yang BERLAKU, bukan dari angka yang
 * diketik ulang. Bila admin mengubah komisi, ilustrasi ini ikut berubah pada
 * revalidate berikutnya . tanpa redeploy dan tanpa ada yang perlu mengingatnya.
 */
export function revenueSplit(cfg: PlatformConfig, order = 100000): RevenueSplit {
  const posko = Math.round(order * cfg.platform_fee_rate);
  return {
    order: formatRupiah(order),
    partner: formatRupiah(order - posko),
    posko: formatRupiah(posko),
    rate: formatFeeRate(cfg.platform_fee_rate),
  };
}

/* ─────────── Roadmap (Section 9) ─────────── */

export interface RoadmapStage {
  tag: string;
  body: string;
}

export const ROADMAP: RoadmapStage[] = [
  { tag: 'NOW', body: 'Prove marketplace in Semarang' },
  { tag: 'NEXT', body: 'Increase transaction density & repeat usage' },
  { tag: 'THEN', body: 'Expand categories & cities' },
  { tag: 'VISION', body: 'The marketplace for services in Indonesia' },
];
