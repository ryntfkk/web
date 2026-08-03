import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Tailwind v4 + App Router: default cssChunking me-reorder chunk CSS saat
  // navigasi klien sehingga presedensi utility (cascade layer) berubah —
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
      // satu URL. Rute generik /legal/[slug] TIDAK boleh ikut menyajikannya —
      // teks identik di dua alamat memecah bobot SEO.
      //
      // Ditangani di sini, bukan lewat permanentRedirect() di dalam page:
      // terbukti redirect dari dalam page TIDAK tereksekusi pada deployment
      // Amplify ini (/legal/privacy malah menyajikan halaman "tidak ditemukan"
      // ber-status 200) — konsisten dengan catatan pada redirect /services di atas.
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
              "img-src 'self' data: blob: https://*.cloudfront.net https://*.s3.ap-southeast-1.amazonaws.com https://*.googleusercontent.com; " +
              // accounts.google.com = skrip Google Identity Services (tombol
              // "Masuk dengan Google").
              "script-src 'self' 'unsafe-inline' " + (isDev ? "'unsafe-eval' " : "") + "https://app.sandbox.midtrans.com https://app.midtrans.com https://accounts.google.com https://apis.google.com; " +
              "connect-src 'self' https://api.poskojasa.com wss://api.poskojasa.com https://accounts.google.com; " +
              // GIS merender tombol & dialog persetujuannya di dalam iframe.
              "frame-src https://app.sandbox.midtrans.com https://app.midtrans.com https://accounts.google.com; " +
              "style-src 'self' 'unsafe-inline' https://accounts.google.com; " +
              "font-src 'self' data:; " +
              "base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
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
        hostname: 'poskojasa-media-dev.s3.ap-southeast-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'd2qm3dfz28907r.cloudfront.net',
      },
      {
        // Foto profil dari akun Google (avatar_url diisi saat registrasi Google).
        // Tanpa entri ini, next/image MELEMPAR error — bukan sekadar gagal
        // memuat gambar — sehingga halaman yang menampilkan avatar mitra ikut
        // tumbang. Lihat BookingClient.tsx yang merender partner.avatar_url.
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
