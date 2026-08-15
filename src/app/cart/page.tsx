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
import { useCartStore, lineQty, lineTotal, cartTotal, minOrderOf, type CartItem } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useToast } from '@/components/ui/toast';

interface PartnerGroup {
  partner_username: string;
  partner_id: string;
  /** Identitas penerima pembayaran, diambil dari item pertama grup (F-15). */
  partner_name?: string;
  partner_legal_name?: string;
  partner_type?: 'individual' | 'vendor';
  items: CartItem[];
  subtotal: number;
}

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, clearCart, setQuantity, addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { showToast } = useToast();

  // Hapus item/kosongkan keranjang bisa DIURUNGKAN: snapshot diambil sebelum
  // aksi, lalu dikembalikan ke store via addItem saat "Urungkan" diketuk.
  const handleRemoveItem = (item: CartItem) => {
    const snapshot = { ...item };
    removeItem(item.service_id, item.variation_id);
    showToast(`${item.service_name} dihapus dari keranjang`, 'info', 5000, {
      label: 'Urungkan',
      onClick: () => { addItem(snapshot); },
    });
  };

  const handleClearCart = () => {
    const snapshot = items.map((i) => ({ ...i }));
    clearCart();
    showToast('Keranjang dikosongkan', 'info', 5000, {
      label: 'Urungkan',
      onClick: () => { snapshot.forEach((i) => addItem(i)); },
    });
  };

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
          partner_name: item.partner_name,
          partner_legal_name: item.partner_legal_name,
          partner_type: item.partner_type,
          items: [],
          subtotal: 0,
        });
      }
      const group = map.get(key)!;
      group.items.push(item);
      group.subtotal += lineTotal(item);
    }
    return Array.from(map.values());
  }, [items]);

  // Kuantitas IKUT dihitung . tanpa itu angka di keranjang lebih kecil
  // daripada yang benar-benar ditagih saat checkout (audit E4).
  const total = useMemo(() => cartTotal(items), [items]);

  const handleCheckout = (group: PartnerGroup) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent('/cart')}`);
      return;
    }
    const ids = group.items.map((i) => i.service_id).join(',');
    // Sejajarkan variation_ids dengan service_ids (slot kosong = tanpa variasi).
    const varIds = group.items.map((i) => i.variation_id ?? '').join(',');
    const varParam = group.items.some((i) => i.variation_id) ? `&variation_ids=${varIds}` : '';
    // Kuantitas ikut dibawa, sejajar per indeks . kalau tidak, apa pun yang
    // dipilih pelanggan di keranjang di-reset ke min_order di langkah booking.
    const qtyParam = `&quantities=${group.items.map((i) => lineQty(i)).join(',')}`;
    router.push(`/book/${group.partner_username}?service_ids=${ids}${varParam}${qtyParam}`);
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
      {/* titleAs="p": H1 halaman ada di badan konten . tanpa ini HTML memuat DUA H1 sekaligus (audit A6). */}
      <MobilePageHeader
        titleAs="p"
        title={items.length > 0 ? `Keranjang (${items.length})` : 'Keranjang'}
        maxWidthClass="max-w-3xl"
        right={
          items.length > 0 ? (
            <button onClick={handleClearCart} className="text-xs text-brand-error font-medium hover:underline">
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
            <button onClick={handleClearCart} className="text-sm text-brand-error font-medium hover:underline">
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
              description="Belum ada layanan di keranjang Anda. Yuk, cari layanan yang Anda butuhkan!"
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
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-brand-gray-900 truncate">
                      {group.partner_name ? group.partner_name : `@${group.partner_username}`}
                    </span>

                  </span>
                  <ChevronRight className="w-4 h-4 text-brand-gray-450 shrink-0" />
                </Link>

                {/* Items . kartu horizontal yang sama dengan halaman booking */}
                <div className="p-3 space-y-2">
                  {group.items.map((item) => {
                    const qty = lineQty(item);
                    const min = minOrderOf(item);
                    return (
                      <div key={`${item.service_id}::${item.variation_id ?? ''}`} className="space-y-2">
                        <ServiceItemCard
                          name={item.variation_name ? `${item.service_name} - ${item.variation_name}` : item.service_name}
                          price={item.price}
                          photoUrl={item.photo_url || undefined}
                          action={
                            <button
                              onClick={() => handleRemoveItem(item)}
                              className="p-2 text-brand-gray-450 hover:text-brand-error hover:bg-brand-error-soft rounded-lg shrink-0 transition-colors"
                              aria-label={`Hapus ${item.service_name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          }
                        />
                        {/* Stepper kuantitas . sebelumnya keranjang tidak mengenal
                            jumlah sama sekali, jadi pelanggan harus menunggu
                            langkah 2 booking untuk mengubahnya (audit E4). */}
                        <div className="flex items-center justify-between gap-3 px-1">
                          <div className="text-xs text-brand-gray-450">
                            {min > 1 ? `Min. ${min} unit` : 'Jumlah'}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label={`Kurangi jumlah ${item.service_name}`}
                              onClick={() => setQuantity(item.service_id, item.variation_id, qty - 1)}
                              disabled={qty <= min}
                              className="w-8 h-8 rounded-md border border-brand-gray-100 text-brand-gray-900 disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand-red transition-colors"
                            >
                              −
                            </button>
                            <span className="min-w-8 text-center text-sm font-semibold text-brand-gray-900" aria-live="polite">
                              {qty}
                            </span>
                            <button
                              type="button"
                              aria-label={`Tambah jumlah ${item.service_name}`}
                              onClick={() => setQuantity(item.service_id, item.variation_id, qty + 1)}
                              disabled={qty >= 100}
                              className="w-8 h-8 rounded-md border border-brand-gray-100 text-brand-gray-900 disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand-red transition-colors"
                            >
                              +
                            </button>
                            <span className="ml-1 text-sm font-semibold text-brand-gray-900 tabular-nums">
                              {formatRupiah(lineTotal(item))}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Group footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-brand-gray-100 bg-brand-gray-55">
                  <div>
                    <p className="text-xs text-brand-gray-450">
                      Subtotal ({group.items.reduce((n, i) => n + lineQty(i), 0)} unit · {group.items.length} layanan)
                    </p>
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
              Pesan
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

