import type { Metadata } from 'next';
import ServiceDetailClient from './ServiceDetailClient';

// SE4: metadata default halaman layanan. Detail per-layanan (generateMetadata
// dari nama layanan) menyusul saat route dinamis /services/[id] dibuat (SE Fase 3).
export const metadata: Metadata = {
  title: 'Semua Layanan',
  description: 'Jelajahi ribuan layanan jasa dari mitra terverifikasi di Posko Jasa.',
  alternates: { canonical: 'https://poskojasa.com/services' },
};

export default function LayananPage() {
  return <ServiceDetailClient />;
}
