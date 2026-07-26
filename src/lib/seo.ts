// Helper SEO untuk halaman kategori & landing lokal: data ringkas dari daftar
// layanan (harga mulai, jumlah) + FAQ ber-data → konten unik per halaman
// (hindari "thin content" pada halaman programmatic) + eligible FAQ rich result.

interface PricedService {
  price: number;
}

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Harga terendah (> 0) dari daftar layanan, atau null bila kosong. */
export function minServicePrice(services: PricedService[]): number | null {
  const prices = services.map((s) => s.price).filter((p) => typeof p === 'number' && p > 0);
  return prices.length ? Math.min(...prices) : null;
}

export interface FaqItem {
  q: string;
  a: string;
}

/** JSON-LD FAQPage dari daftar Q&A. */
export function faqJsonLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
}

function pricePhrase(minPrice: number | null): string {
  return minPrice ? `mulai dari ${formatRupiah(minPrice)}` : 'yang transparan';
}

/** Paragraf pembuka unik untuk halaman kategori (tanpa kota). */
export function categoryIntro(catName: string, count: number, minPrice: number | null): string {
  const jumlah = count > 0 ? `${count} layanan` : 'layanan';
  return `Cari jasa ${catName}? Posko Jasa mempertemukan Anda dengan mitra profesional terverifikasi. Bandingkan ${jumlah} ${catName} dengan harga ${pricePhrase(minPrice)}, lihat ulasan asli pelanggan, lalu pesan online — mitra datang sesuai jadwal Anda.`;
}

/** Paragraf pembuka unik untuk landing lokal (kategori × kota). */
export function localIntro(catName: string, city: string, count: number, minPrice: number | null): string {
  const jumlah = count > 0 ? `${count} layanan` : 'layanan';
  return `Butuh jasa ${catName} di ${city}? Temukan ${jumlah} ${catName} dari mitra terverifikasi yang berbasis di ${city} dan sekitarnya, dengan harga ${pricePhrase(minPrice)}. Pesan online di Posko Jasa — harga transparan, ulasan asli, dan mitra datang ke lokasi Anda.`;
}

export function categoryFaq(catName: string, minPrice: number | null): FaqItem[] {
  return [
    {
      q: `Berapa biaya jasa ${catName}?`,
      a: `Biaya jasa ${catName} di Posko Jasa ${pricePhrase(minPrice)}. Harga akhir tergantung mitra, cakupan pekerjaan, dan lokasi, dan selalu tampil transparan sebelum Anda memesan.`,
    },
    {
      q: `Bagaimana cara memesan jasa ${catName}?`,
      a: `Pilih layanan ${catName} yang cocok, cek detail serta ulasan mitranya, lalu pesan online. Mitra akan datang sesuai jadwal yang Anda tentukan.`,
    },
    {
      q: `Apakah mitra ${catName} di Posko Jasa terverifikasi?`,
      a: `Ya. Setiap mitra melewati verifikasi identitas sebelum menerima pesanan, dan Anda dapat melihat rating serta ulasan asli dari pelanggan sebelumnya.`,
    },
  ];
}

export function localFaq(
  catName: string,
  city: string,
  count: number,
  minPrice: number | null,
): FaqItem[] {
  return [
    {
      q: `Berapa biaya jasa ${catName} di ${city}?`,
      a: `Biaya jasa ${catName} di ${city} ${pricePhrase(minPrice)}. Harga akhir tergantung mitra dan cakupan pekerjaan, dan selalu tampil transparan sebelum memesan.`,
    },
    {
      q: `Apakah ada mitra ${catName} yang melayani ${city}?`,
      a:
        count > 0
          ? `Ya, saat ini tersedia ${count} layanan ${catName} dari mitra dengan basecamp di ${city} di Posko Jasa.`
          : `Ketersediaan mitra ${catName} di ${city} dapat berubah. Cek daftar terbaru di halaman ini atau jelajahi jasa ${catName} di kota lain.`,
    },
    {
      q: `Bagaimana cara memesan jasa ${catName} di ${city}?`,
      a: `Pilih layanan ${catName} dari mitra ${city} yang cocok, cek ulasannya, lalu pesan online. Mitra akan datang ke lokasi Anda sesuai jadwal.`,
    },
  ];
}
