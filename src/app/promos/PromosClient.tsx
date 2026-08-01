'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TicketPercent, Copy, Check, Clock, Tag, TrendingUp } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAvailablePromos, type Promo } from '@/hooks/usePromos';
import { useToast } from '@/components/ui/toast';
import { formatPrice } from '@/lib/format';

export default function PromosClient() {
  const { data: promos, isLoading } = useAvailablePromos();
  const { showToast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      showToast('Kode promo disalin', 'success');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      showToast('Gagal menyalin kode', 'error');
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDiscount = (p: Promo) => {
    if (p.discount_type === 'percentage') {
      return `${p.value}%`;
    }
    return formatPrice(p.value);
  };

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
      <MobilePageHeader title="Promo Menarik" titleAs="p" backHref="/" maxWidthClass="max-w-3xl" />

      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-md bg-brand-red-light flex items-center justify-center shrink-0">
            <TicketPercent className="w-5 h-5 text-brand-red" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-gray-900">Promo & Diskon</h1>
            <p className="text-sm text-brand-gray-450">Hemat lebih banyak dengan promo aktif</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-md" />
            ))}
          </div>
        ) : !promos || promos.length === 0 ? (
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
        ) : (
          <div className="space-y-4">
            {promos.map((promo) => {
              const remaining = promo.usage_limit > 0
                ? promo.usage_limit - promo.used_count
                : -1;
              const isExpiringSoon = new Date(promo.valid_until).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

              return (
                <div
                  key={promo.id}
                  className="bg-white rounded-md border border-brand-gray-100 overflow-hidden shadow-sm"
                >
                  <div className="flex">
                    {/* Left: discount badge */}
                    <div className="w-24 sm:w-28 bg-brand-red flex flex-col items-center justify-center text-white p-3 shrink-0">
                      <TrendingUp className="w-5 h-5 mb-1" />
                      <span className="text-2xl font-bold leading-none">{formatDiscount(promo)}</span>
                      <span className="text-[10px] uppercase tracking-wide mt-1 opacity-90">
                        {promo.discount_type === 'percentage' ? 'Diskon' : 'Potongan'}
                      </span>
                    </div>

                    {/* Right: details */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-brand-gray-900 leading-snug">
                          {promo.name || promo.code}
                        </h3>
                        {promo.sponsor === 'platform' ? (
                          <span className="bg-brand-red-light text-brand-red text-[10px] font-medium px-2 py-0.5 rounded shrink-0">
                            Platform
                          </span>
                        ) : (
                          <span className="bg-brand-blue-light text-brand-blue text-[10px] font-medium px-2 py-0.5 rounded shrink-0">
                            Mitra
                          </span>
                        )}
                      </div>

                      {promo.description && (
                        <p className="text-sm text-brand-gray-700 mb-2 line-clamp-2">{promo.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-gray-450 mb-3">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          Min. {formatPrice(promo.min_order_amount)}
                        </span>
                        {promo.max_discount && promo.max_discount > 0 && promo.discount_type === 'percentage' && (
                          <span className="flex items-center gap-1">
                            Maks. {formatPrice(promo.max_discount)}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 ${isExpiringSoon ? 'text-brand-orange font-medium' : ''}`}>
                          <Clock className="w-3 h-3" />
                          {isExpiringSoon ? 'Berakhir segera: ' : 'Berlaku s/d '}
                          {formatDate(promo.valid_until)}
                        </span>
                        {remaining >= 0 && remaining < 10 && (
                          <span className="text-brand-error font-medium">
                            Sisa {remaining} kupon
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-brand-gray-60 border border-dashed border-brand-gray-100 rounded px-3 py-2">
                          <span className="font-mono text-sm font-semibold text-brand-gray-900 tracking-wider">
                            {promo.code}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(promo.code)}
                          aria-label={`Salin kode ${promo.code}`}
                        >
                          {copiedCode === promo.code ? (
                            <><Check className="w-4 h-4" /> Tersalin</>
                          ) : (
                            <><Copy className="w-4 h-4" /> Salin</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="text-center pt-4">
              <Link href="/services">
                <Button variant="outline">Jelajahi Layanan Lainnya</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
