import type { MetadataRoute } from 'next';

// SE7: web manifest (sinyal PWA/mobile). theme_color = merah brand (primary).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Posko Jasa — Marketplace Jasa Terpercaya',
    short_name: 'Posko Jasa',
    description: 'Temukan & pesan jasa profesional terpercaya di dekat Anda.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#b51822',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
  };
}
