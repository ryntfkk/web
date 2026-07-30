import type { Metadata } from 'next';
import PromosClient from './PromosClient';

export const metadata: Metadata = {
  title: 'Promo & Diskon',
  description: 'Promo dan diskon layanan jasa terbaru di Posko Jasa.',
  alternates: { canonical: 'https://poskojasa.com/promos' },
};

export default function PromosPage() {
  return <PromosClient />;
}
