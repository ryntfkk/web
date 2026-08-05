import type { MetadataRoute } from 'next';

// SE1: robots.txt via konvensi App Router (di-serve otomatis di /robots.txt).
// Halaman privasi/transaksi di-disallow agar tak terindeks (lapis pertama;
// meta noindex per-halaman = lapis kedua).
// SE: /_next/static/ di-disallow . file build (JS/CSS/font) berubah hash tiap
// deploy, URL lama 404 & muncul di GSC sebagai error. Tidak perlu di-crawl.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/mitra/',
        '/profile/',
        '/orders/',
        '/chat/',
        '/cart',
        '/payment/',
        '/notifications',
        '/disputes/',
        '/bantuan/',
        '/api/',
        '/_next/static/',
      ],
    },
    sitemap: 'https://poskojasa.com/sitemap.xml',
    host: 'https://poskojasa.com',
  };
}
