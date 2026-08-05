import type { PlatformConfig } from '@/hooks/usePlatformConfig';
import { formatFeeRate } from '@/hooks/usePlatformConfig';
import { formatRupiah } from '@/lib/format';
import type { FaqItem } from '@/lib/seo';

/**
 * Isi halaman /jadi-mitra.
 *
 * Dipisah dari komponennya karena teks yang sama dipakai DUA kali: sebagai
 * bacaan di halaman, dan sebagai JSON-LD FAQPage untuk rich result. Ditulis
 * dua kali, keduanya pasti menyimpang — dan yang menyimpang itu justru yang
 * dibaca Google.
 *
 * ATURAN: tidak ada angka bisnis sebagai literal di berkas ini. Komisi, biaya
 * penarikan, dan harga layanan minimum SELALU diturunkan dari PlatformConfig
 * yang diambil dari /config, supaya perubahan admin ikut terbawa tanpa
 * redeploy. Halaman ini membuat janji publik soal biaya — angka basi di sini
 * adalah janji yang salah, bukan sekadar teks usang.
 */

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
 * "butuh login") — itu yang bisa dipertahankan. Klaim absolut soal produk pihak
 * lain tidak bisa kita buktikan dan tidak perlu: kelemahannya sudah dirasakan
 * sendiri oleh orang yang membaca halaman ini.
 */
export const COMPARE_ROWS: CompareRow[] = [
  {
    aspek: 'Ditemukan lewat Google',
    lama: 'Praktis tidak muncul di hasil pencarian — sebagian besar butuh login dulu untuk dilihat.',
    posko: 'Tiap layanan & profil punya halaman sendiri yang terbuka untuk mesin pencari dan terdaftar di sitemap.',
  },
  {
    aspek: 'Umur postingan',
    lama: 'Tenggelam dalam hitungan jam terdorong postingan baru. Harus repost terus-menerus.',
    posko: 'Halaman permanen. Sekali pasang, tetap bisa ditemukan tanpa repost.',
  },
  {
    aspek: 'Harga & cakupan kerja',
    lama: 'Dijelaskan ulang di tiap chat. Sering beda-beda dan jadi sumber salah paham.',
    posko: 'Tersimpan di layanan: harga, satuan, durasi, yang termasuk dan yang tidak.',
  },
  {
    aspek: 'Kepercayaan pelanggan baru',
    lama: 'Hanya klaim sepihak. Pelanggan tak punya cara memeriksa.',
    posko: 'Rating & ulasan hanya bisa ditulis pelanggan yang benar-benar memesan.',
  },
  {
    aspek: 'Pembayaran',
    lama: 'Transfer langsung. Risiko tak dibayar setelah pekerjaan selesai ditanggung sendiri.',
    posko: 'Pembayaran pelanggan ditahan Posko lebih dulu, lalu masuk saldo Anda setelah pekerjaan selesai.',
  },
  {
    aspek: 'Jadwal',
    lama: 'Diatur manual lewat chat. Bentrok jadwal baru ketahuan belakangan.',
    posko: 'Jam kerja, jeda istirahat, dan cuti Anda otomatis menolak jam yang tidak tersedia.',
  },
];

/** Mekanisme SEO yang benar-benar berjalan — bukan janji peringkat. */
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
    judul: 'Anda ikut di halaman “jasa + kota”',
    contoh: 'poskojasa.com/jasa/service-ac/bekasi',
    isi: 'Posko punya halaman khusus untuk tiap kombinasi jenis jasa dan kota — persis yang diketik orang saat mencari. Layanan Anda tampil di halaman kota Anda sendiri.',
  },
];

/** Kemampuan yang tidak muat di satu postingan. Semua sudah ada di sistem. */
export const SETUP_POINTS = [
  {
    judul: 'Harga yang tidak perlu ditawar ulang',
    isi: 'Tentukan harga, satuan (per unit, per m², per jam), minimum order, dan perkiraan durasi. Pelanggan melihatnya sebelum memesan.',
  },
  {
    judul: 'Variasi dalam satu layanan',
    isi: 'Satu layanan bisa punya beberapa pilihan dengan harga berbeda — misalnya AC 0,5 PK, 1 PK, dan 2 PK — tanpa membuat tiga layanan terpisah.',
  },
  {
    judul: 'Batas pekerjaan yang tegas',
    isi: 'Isi daftar “termasuk” dan “tidak termasuk”. Penambahan freon atau material yang tidak Anda tanggung tertulis sejak awal, bukan jadi perdebatan di lokasi.',
  },
  {
    judul: 'Syarat yang harus disiapkan pelanggan',
    isi: 'Minta hal yang Anda butuhkan di lokasi — sumber air, akses listrik, area parkir. Pelanggan menyetujuinya saat memesan.',
  },
  {
    judul: 'Jadwal yang menolak sendiri',
    isi: 'Atur jam kerja per hari, jeda istirahat, dan tanggal cuti. Pesanan di luar jam itu tidak bisa masuk — tidak perlu Anda tolak satu per satu.',
  },
  {
    judul: 'Biaya perjalanan & biaya tambahan',
    isi: 'Biaya transport dihitung otomatis dari jarak. Bila di lokasi ternyata ada pekerjaan tambahan, ajukan biayanya lewat aplikasi untuk disetujui pelanggan.',
  },
];

/** Alur satu pesanan, dari masuk sampai uangnya bisa ditarik. */
export const FLOW_STEPS = [
  {
    judul: 'Pesanan masuk',
    isi: 'Anda dapat notifikasi berisi jenis pekerjaan, lokasi, dan jadwal yang diminta.',
  },
  {
    judul: 'Terima atau tolak',
    isi: 'Keputusan tetap di tangan Anda. Tidak ada kewajiban mengambil semua pesanan.',
  },
  {
    judul: 'Koordinasi lewat chat',
    isi: 'Bicarakan detail langsung di aplikasi, tanpa perlu bertukar nomor pribadi lebih dulu.',
  },
  {
    judul: 'Kerjakan, lalu tandai selesai',
    isi: 'Pelanggan sudah membayar di muka ke Posko sebelum Anda berangkat. Anda tinggal bekerja.',
  },
  {
    judul: 'Dana masuk saldo',
    isi: 'Setelah pesanan selesai, bagian Anda masuk saldo dan bisa ditarik ke rekening sendiri.',
  },
];

/** Yang perlu disiapkan sebelum mendaftar — urut sesuai langkah form. */
export const PREP_ITEMS = [
  'Foto KTP dan swafoto memegang KTP',
  'Data badan usaha beserta dokumennya — khusus pendaftar vendor/PT/CV',
  'Foto profil dan deskripsi singkat keahlian Anda',
  'Titik lokasi basecamp tempat Anda beroperasi',
  'Nomor rekening bank untuk pencairan dana',
];

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
    judul: 'Halaman kota Anda masih lengang',
    isi: 'Halaman “jasa + kota” untuk daerah Anda baru terisi sedikit mitra. Makin awal masuk, makin besar porsi perhatian yang jatuh ke Anda saat ada yang mencari.',
  },
  {
    judul: 'Ulasan menumpuk lebih dulu',
    isi: 'Saat pelanggan menelusuri tanpa berbagi lokasi, mitra diurutkan berdasarkan rating. Ulasan yang Anda kumpulkan hari ini jadi keunggulan yang sulit dikejar pendatang baru.',
  },
  {
    judul: 'Halaman Anda punya waktu untuk dikenali',
    isi: 'Mesin pencari butuh waktu mengenali halaman baru. Profil yang dibuat sekarang sudah melewati masa itu ketika pesaing Anda baru mulai mendaftar.',
  },
];

/**
 * FAQ — dipakai sebagai bacaan DAN sebagai JSON-LD FAQPage.
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
      a: 'Setiap layanan dan profil mitra punya halaman sendiri yang terbuka untuk mesin pencari dan didaftarkan otomatis ke sitemap Posko — berbeda dari postingan di grup atau marketplace media sosial yang umumnya perlu login untuk dilihat. Terindeks bukan jaminan peringkat satu, tetapi halaman Anda ada, permanen, dan bisa terbaca.',
    },
    {
      q: 'Berapa harga minimum layanan yang boleh dipasang?',
      a: `Harga layanan minimal ${hargaMin}. Bila jasa yang Anda tawarkan biasanya di bawah itu, gabungkan menjadi satu paket layanan — misalnya beberapa unit sekaligus atau satu kali kunjungan penuh.`,
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
      a: 'Tidak. Anda mengatur sendiri jam kerja per hari, jeda istirahat, dan tanggal cuti — pesanan di luar jam tersebut tidak akan masuk. Pesanan yang masuk pun tetap bisa Anda tolak.',
    },
  ];
}
