import type { PlatformConfig } from '@/hooks/usePlatformConfig';
import { formatFeeRate } from '@/hooks/usePlatformConfig';
import { formatRupiah } from '@/lib/format';
import type { FaqItem } from '@/lib/seo';

/**
 * Isi halaman /jadi-mitra.
 *
 * Dipisah dari komponennya karena teks yang sama dipakai DUA kali: sebagai
 * bacaan di halaman, dan sebagai JSON-LD FAQPage untuk rich result. Ditulis
 * dua kali, keduanya pasti menyimpang . dan yang menyimpang itu justru yang
 * dibaca Google.
 *
 * ATURAN: tidak ada angka bisnis sebagai literal di berkas ini. Komisi, biaya
 * penarikan, dan harga layanan minimum SELALU diturunkan dari PlatformConfig
 * yang diambil dari /config, supaya perubahan admin ikut terbawa tanpa
 * redeploy. Halaman ini membuat janji publik soal biaya . angka basi di sini
 * adalah janji yang salah, bukan sekadar teks usang.
 */

/* ─────────── Hero stats ─────────── */

export interface HeroStat {
  angka: string;
  label: string;
}

export const HERO_STATS: HeroStat[] = [
  { angka: 'Rp 0', label: 'Biaya daftar' },
  { angka: '24/7', label: 'Halaman aktif' },
  { angka: '100%', label: 'Anda atur sendiri' },
];

/* ─────────── Compare rows ─────────── */

/** Satu baris perbandingan: keadaan lama vs keadaan di Posko. */
export interface CompareRow {
  aspek: string;
  lama: string;
  posko: string;
}

/**
 * Perbandingan dengan cara jualan yang ditinggalkan mitra.
 *
 * Klaim soal platform lain sengaja ditulis hati-hati ("praktis tidak muncul",
 * "butuh login") . itu yang bisa dipertahankan. Klaim absolut soal produk pihak
 * lain tidak bisa kita buktikan dan tidak perlu: kelemahannya sudah dirasakan
 * sendiri oleh orang yang membaca halaman ini.
 */
export const COMPARE_ROWS: CompareRow[] = [
  {
    aspek: 'Ditemukan lewat Google',
    lama: 'Praktis tidak muncul . butuh login dulu untuk dilihat.',
    posko: 'Halaman terbuka untuk mesin pencari, terdaftar di sitemap.',
  },
  {
    aspek: 'Umur postingan',
    lama: 'Tenggelam dalam hitungan jam. Harus repost terus.',
    posko: 'Halaman permanen. Sekali pasang, tetap ditemukan.',
  },
  {
    aspek: 'Harga & cakupan kerja',
    lama: 'Dijelaskan ulang di tiap chat. Sering jadi salah paham.',
    posko: 'Tersimpan jelas: harga, satuan, durasi, termasuk & tidak.',
  },
  {
    aspek: 'Kepercayaan pelanggan',
    lama: 'Klaim sepihak. Tak bisa diperiksa.',
    posko: 'Rating & ulasan dari pelanggan yang benar-benar memesan.',
  },
  {
    aspek: 'Pembayaran',
    lama: 'Transfer langsung. Risiko tak dibayar.',
    posko: 'Ditahan Posko dulu, masuk saldo setelah selesai.',
  },
  {
    aspek: 'Jadwal',
    lama: 'Diatur manual. Bentrok baru ketahuan belakangan.',
    posko: 'Otomatis menolak jam yang tidak tersedia.',
  },
];

/* ─────────── SEO points ─────────── */

/** Mekanisme SEO yang benar-benar berjalan . bukan janji peringkat. */
export const SEO_POINTS = [
  {
    judul: 'Tiap layanan punya halamannya sendiri',
    contoh: 'poskojasa.com/services/…',
    isi: 'Satu layanan = satu halaman dengan judul, harga, dan deskripsinya sendiri. Inilah yang dibaca mesin pencari, bukan sebuah postingan yang tercampur ribuan postingan lain.',
  },
  {
    judul: 'Profil Anda jadi alamat permanen',
    contoh: 'poskojasa.com/nama-anda',
    isi: 'Alamat yang bisa Anda cantumkan di stiker, kartu nama, atau bio media sosial. Profil mitra ikut didaftarkan otomatis ke sitemap yang dibaca Google.',
  },
  {
    judul: 'Anda ikut di halaman "jasa + kota"',
    contoh: 'poskojasa.com/jasa/service-ac/bekasi',
    isi: 'Posko punya halaman khusus untuk tiap kombinasi jenis jasa dan kota . persis yang diketik orang saat mencari. Layanan Anda tampil di halaman kota Anda sendiri.',
  },
];

/* ─────────── Setup points ─────────── */

/** Kemampuan yang tidak muat di satu postingan. Semua sudah ada di sistem. */
export const SETUP_POINTS = [
  {
    judul: 'Harga jelas',
    isi: 'Tentukan harga, satuan, minimum order, dan durasi. Pelanggan lihat sebelum memesan.',
  },
  {
    judul: 'Variasi layanan',
    isi: 'Satu layanan bisa punya beberapa pilihan harga . misal AC 0,5 PK, 1 PK, 2 PK.',
  },
  {
    judul: 'Batas kerja tegas',
    isi: 'Isi daftar "termasuk" dan "tidak termasuk". Tertulis sejak awal, bukan debat di lokasi.',
  },
  {
    judul: 'Syarat pelanggan',
    isi: 'Minta apa yang Anda butuhkan di lokasi. Pelanggan menyetujui saat memesan.',
  },
  {
    judul: 'Jadwal otomatis',
    isi: 'Atur jam kerja, jeda, dan cuti. Pesanan di luar jam itu tidak masuk.',
  },
  {
    judul: 'Biaya transport',
    isi: 'Dihitung otomatis dari jarak. Biaya tambahan bisa diajukan lewat aplikasi.',
  },
];

/* ─────────── Flow steps ─────────── */

/** Alur satu pesanan, dari masuk sampai uangnya bisa ditarik. */
export const FLOW_STEPS = [
  {
    judul: 'Pesanan masuk',
    isi: 'Notifikasi berisi jenis pekerjaan, lokasi, dan jadwal.',
  },
  {
    judul: 'Terima / tolak',
    isi: 'Keputusan di tangan Anda. Tidak wajib ambil semua.',
  },
  {
    judul: 'Chat & koordinasi',
    isi: 'Detail langsung di aplikasi, tanpa tukar nomor pribadi.',
  },
  {
    judul: 'Kerjakan',
    isi: 'Pelanggan sudah bayar ke Posko. Anda tinggal bekerja.',
  },
  {
    judul: 'Dana masuk',
    isi: 'Bagian Anda masuk saldo, bisa ditarik ke rekening.',
  },
];

/* ─────────── Prep items ─────────── */

/** Yang perlu disiapkan sebelum mendaftar . urut sesuai langkah form. */
export const PREP_ITEMS = [
  'Foto KTP',
  'Data badan usaha beserta dokumennya (khusus vendor/PT/CV)',
  'Foto profil dan deskripsi singkat keahlian Anda',
  'Titik lokasi basecamp tempat Anda beroperasi',
  'Nomor rekening bank untuk pencairan dana',
];

/* ─────────── Early advantages ─────────── */

/**
 * Keunggulan pendaftar awal.
 *
 * SENGAJA tidak menjanjikan badge perintis, diskon komisi, atau prioritas
 * tampil: tidak satu pun ada di backend (tak ada kolom featured/priority).
 * Yang ditulis di sini semuanya konsekuensi nyata dari cara sistem bekerja
 * sekarang, jadi tak ada yang perlu dibangun untuk menepatinya.
 */
export const EARLY_ADVANTAGES = [
  {
    judul: 'Halaman kota masih lengang',
    isi: 'Makin awal masuk, makin besar porsi perhatian yang jatuh ke Anda.',
  },
  {
    judul: 'Ulasan menumpuk lebih dulu',
    isi: 'Mitra diurutkan berdasarkan rating. Ulasan hari ini jadi keunggulan yang sulit dikejar.',
  },
  {
    judul: 'Halaman dikenali lebih awal',
    isi: 'Mesin pencari butuh waktu mengenali halaman baru. Profil Anda sudah melewati masa itu.',
  },
];

/* ─────────── FAQ ─────────── */

/**
 * FAQ . dipakai sebagai bacaan DAN sebagai JSON-LD FAQPage.
 *
 * Menerima config sebagai argumen, bukan membacanya sendiri, supaya pemanggil
 * di server yang menentukan kapan datanya diambil (dan berkas ini tetap murni).
 */
export function partnerFaq(cfg: PlatformConfig): FaqItem[] {
  const komisi = formatFeeRate(cfg.platform_fee_rate);
  const biayaTarik = formatRupiah(cfg.withdrawal_fee);
  const hargaMin = formatRupiah(cfg.min_transaction);
  const slaTarik = cfg.profile?.withdrawal_sla?.trim();

  return [
    {
      q: 'Apakah gratis bergabung jadi mitra Posko Jasa?',
      a: `Ya. Tidak ada biaya pendaftaran, biaya langganan, maupun biaya iklan. Posko hanya mengambil komisi ${komisi} dari pesanan yang benar-benar selesai. Bila belum ada pesanan yang masuk, Anda tidak mengeluarkan biaya sama sekali.`,
    },
    {
      q: 'Berapa komisi yang dipotong Posko Jasa?',
      a: `Komisi ${komisi} per pesanan selesai, dipotong otomatis sebelum dana masuk ke saldo Anda. Saat menarik saldo ke rekening dikenakan biaya ${biayaTarik} per penarikan. Di luar itu tidak ada potongan lain.`,
    },
    {
      q: 'Apakah jasa saya akan muncul di pencarian Google?',
      a: 'Setiap layanan dan profil mitra punya halaman sendiri yang terbuka untuk mesin pencari dan didaftarkan otomatis ke sitemap Posko . berbeda dari postingan di grup atau marketplace media sosial yang umumnya perlu login untuk dilihat. Terindeks bukan jaminan peringkat satu, tetapi halaman Anda ada, permanen, dan bisa terbaca.',
    },
    {
      q: 'Berapa harga minimum layanan yang boleh dipasang?',
      a: `Harga layanan minimal ${hargaMin}. Bila jasa yang Anda tawarkan biasanya di bawah itu, gabungkan menjadi satu paket layanan . misalnya beberapa unit sekaligus atau satu kali kunjungan penuh.`,
    },
    {
      q: 'Siapa saja yang bisa mendaftar jadi mitra?',
      a: 'Perorangan maupun badan usaha. Pendaftar perorangan diverifikasi lewat KTP dan swafoto; pendaftar badan usaha melengkapi data serta dokumen usahanya. Keduanya perlu rekening bank untuk pencairan dana.',
    },
    {
      q: 'Kapan uang hasil pekerjaan bisa saya tarik?',
      a: `Pembayaran pelanggan ditahan Posko sampai pekerjaan dinyatakan selesai, lalu bagian Anda masuk ke saldo dan bisa diajukan penarikan ke rekening pribadi.${slaTarik ? ` Pencairan diproses ${slaTarik}.` : ''}`,
    },
    {
      q: 'Apakah saya harus siap menerima pesanan setiap saat?',
      a: 'Tidak. Anda mengatur sendiri jam kerja per hari, jeda istirahat, dan tanggal cuti . pesanan di luar jam tersebut tidak akan masuk. Pesanan yang masuk pun tetap bisa Anda tolak.',
    },
  ];
}
