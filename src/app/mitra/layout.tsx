import type { Metadata } from 'next';
import MitraLayoutClient from './MitraLayoutClient';

export const metadata: Metadata = {
  title: 'Mitra',
  robots: { index: false, follow: false },
};

export default function MitraLayout({ children }: { children: React.ReactNode }) {
  return <MitraLayoutClient>{children}</MitraLayoutClient>;
}
