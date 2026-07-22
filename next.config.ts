import type { NextConfig } from "next";

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
              "img-src 'self' data: blob: https://*.cloudfront.net https://*.s3.ap-southeast-1.amazonaws.com; " +
              "script-src 'self' 'unsafe-inline' https://app.sandbox.midtrans.com https://app.midtrans.com; " +
              "connect-src 'self' https://api.poskojasa.com wss://api.poskojasa.com; " +
              "frame-src https://app.sandbox.midtrans.com https://app.midtrans.com; " +
              "style-src 'self' 'unsafe-inline'; " +
              "font-src 'self' data:; " +
              "base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
          },
        ],
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'poskojasa-media-dev.s3.ap-southeast-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'd2qm3dfz28907r.cloudfront.net',
      },
    ],
  },
};

export default nextConfig;
