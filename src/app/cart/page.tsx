"use client";

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Trash2, ChevronRight } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { Button } from '@/components/ui/button';
import { ServiceItemCard } from '@/components/ui/service-item-card';
import { EmptyState } from '@/components/ui/empty-state';
import { StickyActionBar } from '@/components/ui/sticky-action-bar';
import { Price } from '@/components/ui/price';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRupiah } from '@/lib/format';
import { useCartStore, CartItem } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';

interface PartnerGroup {
  partner_username: string;
  partner_id: string;
  items: CartItem[];
  subtotal: number;
}

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, clearCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  // Hindari hydration mismatch: store dipersist di localStorage,
  // render isi keranjang hanya setelah mount di client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const groups = useMemo<PartnerGroup[]>(() => {
    const map = new Map<string, PartnerGroup>();
    for (const item of items) {
      const key = item.partner_username;
      if (!map.has(key)) {
        map.set(key, {
          partner_username: item.partner_username,
          partner_id: item.partner_id,
          items: [],
          subtotal: 0,
        });
      }
      const group = map.get(key)!;
      group.items.push(item);
      group.subtotal += item.price;
    }
    return Array.from(map.values());
  }, [items]);

  const total = useMemo(() => items.reduce((sum, i) => sum + i.price, 0), [items]);

  const handleCheckout = (group: PartnerGroup) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent('/cart')}`);
      return;
    }
    const ids = group.items.map((i) => i.service_id).join(',');
    // Sejajarkan variation_ids dengan service_ids (slot kosong = tanpa variasi).
    const varIds = group.items.map((i) => i.variation_id ?? '').join(',');
    const varParam = group.items.some((i) => i.variation_id) ? `&variation_ids=${varIds}` : '';
    router.push(`/book/${group.partner_username}?service_ids=${ids}${varParam}`);
  };

  if (!mounted) {
    return (
      <div className="page-h bg-brand-gray-60">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
          <Skeleton className="h-8 w-40" />
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-brand-gray-100 bg-white p-4 space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <div className="flex gap-3">
                <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    // pb mobile: ruang untuk StickyActionBar (h-16+). lg+: standar.
    <div className="page-h bg-brand-gray-60 pb-24 lg:pb-10">
      {/* Header (mobile) */}
      <MobilePageHeader
        title={items.length > 0 ? `Keranjang (${items.length})` : 'Keranjang'}
        maxWidthClass="max-w-3xl"
        right={
          items.length > 0 ? (
            <button onClick={clearCart} className="text-xs text-brand-error font-medium hover:underline">
              Kosongkan
            </button>
          ) : undefined
        }
      />

      {/* Header (desktop) */}
      <div className="hidden lg:block max-w-3xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand-gray-900">
            Keranjang {items.length > 0 && <span className="text-brand-gray-450 font-normal text-lg">({items.length})</span>}
          </h1>
          {items.length > 0 && (
            <button onClick={clearCart} className="text-sm text-brand-error font-medium hover:underline">
              Kosongkan
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {items.length === 0 ? (
          <div className="bg-white rounded-lg border border-brand-gray-100">
            <EmptyState
              icon={ShoppingCart}
              title="Keranjang Kosong"
              description="Belum ada layanan di keranjang Anda. Yuk, cari jasa yang Anda butuhkan!"
              action={
                <Button className="bg-brand-red hover:bg-brand-red-dark rounded-md px-6" onClick={() => router.push('/services')}>
                  Jelajahi Layanan
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.partner_username} className="bg-white rounded-lg border border-brand-gray-100 overflow-hidden">
                {/* Partner header */}
                <Link
                  href={`/${group.partner_username}`}
                  className="flex items-center justify-between px-4 py-3 bg-brand-gray-55 border-b border-brand-gray-100 hover:bg-brand-gray-60"
                >
                  <span className="text-sm font-semibold text-brand-gray-900">@{group.partner_username}</span>
                  <ChevronRight className="w-4 h-4 text-brand-gray-450" />
                </Link>

                {/* Items . kartu horizontal yang sama dengan halaman booking */}
                <div className="p-3 space-y-2">
                  {group.items.map((item) => (
                    <ServiceItemCard
                      key={`${item.service_id}::${item.variation_id ?? ''}`}
                      name={item.variation_name ? `${item.service_name} - ${item.variation_name}` : item.service_name}
                      price={item.price}
                      photoUrl={item.photo_url || undefined}
                      action={
                        <button
                          onClick={() => removeItem(item.service_id, item.variation_id)}
                          className="p-2 text-brand-gray-450 hover:text-brand-error hover:bg-brand-error-soft rounded-lg shrink-0 transition-colors"
                          aria-label={`Hapus ${item.service_name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      }
                    />
                  ))}
                </div>

                {/* Group footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-brand-gray-100 bg-brand-gray-55">
                  <div>
                    <p className="text-xs text-brand-gray-450">Subtotal ({group.items.length} layanan)</p>
                    <Price price={group.subtotal} />
                  </div>
                  <Button
                    className="bg-brand-red hover:bg-brand-red-dark rounded-md px-6"
                    onClick={() => handleCheckout(group)}
                  >
                    Pesan
                  </Button>
                </div>
              </div>
            ))}

            {groups.length > 1 && (
              <p className="text-xs text-brand-gray-450 text-center">
                Pemesanan dilakukan per mitra. Total semua keranjang: <span className="font-semibold">{formatRupiah(total)}</span>
              </p>
            )}
          </>
        )}
      </div>

      {/* Total + Checkout utama. BottomNav tidak tampil di /cart,
          jadi bar selalu berada di paling bawah layar (bottom-0).
          Checkout tunggal hanya saat 1 mitra . pemesanan memang per mitra. */}
      {items.length > 0 && (
        <StickyActionBar className="bottom-0">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-brand-gray-450">Total ({items.length} layanan)</p>
            <Price price={total} />
          </div>
          {groups.length === 1 ? (
            <Button
              className="bg-brand-red hover:bg-brand-red-dark rounded-md px-6"
              onClick={() => handleCheckout(groups[0])}
            >
              Checkout
            </Button>
          ) : (
            <p className="text-[11px] text-brand-gray-450 text-right leading-snug">
              Pemesanan dilakukan<br />per mitra
            </p>
          )}
        </StickyActionBar>
      )}
    </div>
  );
}

