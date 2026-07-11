import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
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
