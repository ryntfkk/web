import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat Mitra',
  robots: { index: false, follow: false },
};

export default function MitraChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
