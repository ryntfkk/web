import type { Metadata } from 'next';
import React from 'react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import AboutClient from './AboutClient';

export const metadata: Metadata = {
  title: 'Tentang Kami',
  description: 'Tentang Posko Jasa, marketplace jasa terpercaya yang menghubungkan Anda dengan penyedia jasa di sekitar.',
  alternates: { canonical: 'https://poskojasa.com/about' },
};

export default function AboutPage() {
  return (
    <div className="page-h bg-brand-gray-60">
      <MobilePageHeader title="Tentang Kami" titleAs="p" backHref="/" maxWidthClass="max-w-2xl" />
      <AboutClient />
    </div>
  );
}
