import type { MetadataRoute } from 'next';

// SE1: robots.txt via konvensi App Router (di-serve otomatis di /robots.txt).
// Halaman privasi/transaksi di-disallow agar tak terindeks (lapis pertama;
// meta noindex per-halaman = lapis kedua).
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
      ],
    },
    sitemap: 'https://poskojasa.com/sitemap.xml',
    host: 'https://poskojasa.com',
  };
}
