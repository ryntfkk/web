import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Tailwind v4 + App Router: default cssChunking me-reorder chunk CSS saat
  // navigasi klien sehingga presedensi utility (cascade layer) berubah .
  // gaya/teks "berubah sendiri" & md:hidden kalah (bottom nav muncul di desktop).
  // 'strict' memaksa urutan CSS mengikuti urutan import → deterministik.
  experimental: {
    cssChunking: 'strict',
  },
  // @ts-ignore
  allowedDevOrigins: ['192.168.0.127', 'localhost'],
  // Proxy API di dev: request same-origin (localhost:3000/api/v1/*) diteruskan
  // ke api.poskojasa.com sehingga cookie refresh_token (SameSite=Lax, host-only)
  // tersimpan untuk localhost dan sesi tidak hilang saat refresh halaman.
  // Aktif hanya jika NEXT_PUBLIC_API_URL relatif (lihat .env.local).
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'https://api.poskojasa.com/api/v1/:path*',
      },
    ];
  },
  // URL detail layanan lama (/services?id=<uuid>) → route kanonik /services/<uuid>.
  // Ditangani di level config (sebelum render) karena redirect di dalam page
  // tidak konsisten saat route juga melayani daftar; ini dijamin 308 permanen
  // sehingga bookmark/tautan lama tetap hidup & bobot SEO menyatu ke satu URL.
  async redirects() {
    return [
      {
        source: '/services',
        has: [{ type: 'query', key: 'id', value: '(?<sid>[^&]+)' }],
        destination: '/services/:sid',
        permanent: true,
      },
      // URL lama /services/<slug> (sebelum migrasi ke UUID, mis. /services/elektronik)
      // → redirect ke /services (halaman daftar). Route [id] sekarang hanya terima
      // UUID; slug non-UUID = 404 di GSC. Redirect 308 menyatukan bobot SEO & hapus
      // error 404 di Search Console. Pattern: /services/ + non-UUID (bukan 36 char
      // hex dengan dash). Next redirect source tidak support negative lookahead,
      // jadi tangkap semua /services/:slug lalu page.tsx yang filter UUID_RE.
      // Tapi untuk slug non-UUID yang jelas lama, redirect ke /services lebih baik
      // dari 404. Kita tangkap pola umum slug (huruf/kategori) di sini.
      {
        source: '/services/:slug([a-z-]+)',
        destination: '/services',
        permanent: true,
      },
      // Dokumen legal yang punya halaman kanoniknya sendiri: satu dokumen harus
      // satu URL. Rute generik /legal/[slug] TIDAK boleh ikut menyajikannya .
      // teks identik di dua alamat memecah bobot SEO.
      //
      // Ditangani di sini, bukan lewat permanentRedirect() di dalam page:
      // terbukti redirect dari dalam page TIDAK tereksekusi pada deployment
      // Amplify ini (/legal/privacy malah menyajikan halaman "tidak ditemukan"
      // ber-status 200) . konsisten dengan catatan pada redirect /services di atas.
      {
        source: '/legal/privacy',
        destination: '/privacy',
        permanent: true,
      },
      {
        source: '/legal/terms',
        destination: '/terms',
        permanent: true,
      },
      // /search tanpa kata kunci = "semua layanan", yang rute kanoniknya
      // /services. Tanpa aturan ini konten yang sama tersaji di dua URL dan
      // bobot SEO-nya pecah.
      //
      // A13-T1: sebelumnya ditulis sebagai permanentRedirect() di dalam
      // src/app/search/page.tsx . dan TIDAK PERNAH tereksekusi. Diuji langsung
      // ke produksi: /search membalas 200 tanpa Location, sementara kontrol
      // /services?id=… membalas 308 dari aturan di berkas ini. Aturannya sudah
      // tercatat (lihat catatan /legal/privacy di atas), pemindahannya saja
      // yang terlewat waktu halaman ini ditulis belakangan.
      //
      // `missing` . bukan `has`: hanya berlaku saat parameter q TIDAK ADA.
      // Pencarian sungguhan (/search?q=…) harus tetap dilayani halamannya.
      {
        source: '/search',
        missing: [{ type: 'query', key: 'q' }],
        destination: '/services',
        permanent: true,
      },
      // Konsolidasi www → non-www (308 permanen). www.poskojasa.com melayani
      // konten yang sama; tanpa redirect ini Google melihat dua host (duplikat).
      // Canonical sudah non-www, tapi redirect memberi sinyal terkuat & merapikan
      // address bar. Hanya menyalakan saat host = www, jadi tak ada loop.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.poskojasa.com' }],
        destination: 'https://poskojasa.com/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), camera=(), microphone=()',
          },
          // S5: CSP dimulai sebagai Report-Only agar tidak memblokir apa pun
          // sampai terverifikasi live (Snap Midtrans redirect + WebSocket chat).
          // Setelah dikonfirmasi tak ada pelanggaran sah, ganti key ini menjadi
          // 'Content-Security-Policy' untuk enforce.
          {
            key: 'Content-Security-Policy-Report-Only',
            value:
              "default-src 'self'; " +
              // lh3.googleusercontent.com = foto profil akun Google. Tanpa ini
              // avatar pengguna yang mendaftar lewat Google akan kosong begitu
              // CSP di-enforce.
              // maps.gstatic.com = ubin & aset Google Maps (terbukti dari
              // laporan CSP nyata, bukan tebakan).
              "img-src 'self' data: blob: https://*.cloudfront.net https://*.s3.ap-southeast-3.amazonaws.com https://*.googleusercontent.com https://maps.gstatic.com https://*.googleapis.com; " +
              // accounts.google.com = skrip Google Identity Services (tombol
              // "Masuk dengan Google").
              // 'wasm-unsafe-eval' = libheif (via heic2any) meng-compile WASM
              // untuk mengonversi foto HEIC iPhone → JPEG di sisi klien. Tanpa
              // ini, konversi gagal begitu CSP di-enforce (izin sempit: hanya
              // WASM, bukan eval() umum).
              "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' " + (isDev ? "'unsafe-eval' " : "") + "https://app.sandbox.midtrans.com https://app.midtrans.com https://accounts.google.com https://apis.google.com https://maps.googleapis.com; " +
              // maps.googleapis.com juga dipanggil lewat XHR/RPC oleh Maps JS.
              "connect-src 'self' https://api.poskojasa.com wss://api.poskojasa.com https://accounts.google.com https://maps.googleapis.com; " +
              // GIS merender tombol & dialog persetujuannya di dalam iframe.
              "frame-src https://app.sandbox.midtrans.com https://app.midtrans.com https://accounts.google.com; " +
              // fonts.googleapis.com = lembar gaya Google Fonts / Material Symbols.
              "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com; " +
              // fonts.gstatic.com = berkas .woff2-nya. Ini pelanggaran TERBANYAK
              // yang dilaporkan (61 dari 84): meng-enforce CSP tanpa baris ini
              // akan mematikan seluruh font situs.
              "font-src 'self' data: https://fonts.gstatic.com; " +
              "base-uri 'self'; form-action 'self'; frame-ancestors 'self'; " +
              // A11-T4: sebelum ini CSP berjalan Report-Only TANPA `report-uri`
              // . tidak ada satu pun laporan yang pernah sampai ke mana pun,
              // jadi "CSP sudah dipasang" tidak pernah bisa diuji.
              //
              // Penerimanya endpoint kita sendiri (POST /csp-report), bukan
              // pihak ketiga: laporan CSP memuat URL halaman yang sedang dibuka
              // pengguna.
              //
              // `report-uri` (bukan `report-to`) dipakai karena ia yang
              // didukung merata; Reporting API belum. Peramban modern
              // menandainya usang tapi tetap menghormatinya.
              "report-uri https://api.poskojasa.com/api/v1/csp-report",
          },
        ],
      },
    ];
  },
  images: {
    // P1: optimizer Next AKTIF (dulu unoptimized:true = gambar dikirim ukuran
    // penuh tanpa WebP/resize). Amplify menangani /_next/image via compute.
    // formats modern didahulukan; deviceSizes disesuaikan agar srcset relevan
    // untuk mayoritas layar mobile Indonesia. minimumCacheTTL menahan hasil
    // optimasi lama di cache CDN (hemat compute).
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 420, 640, 750, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 2592000, // 30 hari
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'poskojasa-media.s3.ap-southeast-3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'd2qm3dfz28907r.cloudfront.net',
      },
      {
        // Foto profil dari akun Google (avatar_url diisi saat registrasi Google).
        // Tanpa entri ini, next/image MELEMPAR error . bukan sekadar gagal
        // memuat gambar . sehingga halaman yang menampilkan avatar mitra ikut
        // tumbang. Lihat BookingClient.tsx yang merender partner.avatar_url.
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
