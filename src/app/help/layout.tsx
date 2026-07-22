import type { Metadata } from 'next';

// SE4: metadata untuk /help (page.tsx = client component).
export const metadata: Metadata = {
  title: 'Bantuan',
  description: 'Pusat bantuan Posko Jasa — pertanyaan umum dan cara menggunakan layanan.',
  alternates: { canonical: 'https://poskojasa.com/help' },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
