import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import { TicketPercent } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Promo & Diskon',
  description: 'Promo dan diskon layanan jasa terbaru di Posko Jasa.',
  alternates: { canonical: 'https://poskojasa.com/promos' },
};

// Sistem promo/voucher backend belum tersedia — halaman ini menampilkan
// empty-state informatif (bukan dead-end) sampai Fase 4 (lihat WEB-IMPLEMENTATION-PLAN.md §4.6).
export default function PromosPage() {
  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
      <MobilePageHeader title="Promo Menarik" backHref="/" maxWidthClass="max-w-3xl" />

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
        <EmptyState
          icon={TicketPercent}
          title="Belum Ada Promo Aktif"
          description="Saat ini belum ada promo yang berlangsung. Sementara itu, jelajahi layanan terbaik dari mitra terverifikasi di sekitar Anda."
          action={
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/services">
                <Button>Jelajahi Layanan</Button>
              </Link>
              <Link href="/categories">
                <Button variant="outline">Lihat Kategori</Button>
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
