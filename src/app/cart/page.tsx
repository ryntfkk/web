"use client";

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceItemCard } from '@/components/ui/service-item-card';
import { useCartStore, CartItem } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';

function formatPrice(p: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
}

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
    router.push(`/book/${group.partner_username}?service_ids=${ids}`);
  };

  if (!mounted) {
    return (
      <div className="page-h bg-[#f7f5f4] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-h bg-[#f7f5f4] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] px-4 py-4 sticky top-16 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
              <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
            </button>
            <h1 className="text-base font-bold text-[#1c1b1b]">
              Keranjang {items.length > 0 && <span className="text-[#9e8e8c] font-normal">({items.length})</span>}
            </h1>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-[#E53E3E] font-medium hover:underline"
            >
              Kosongkan
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e5e2e1] p-10 text-center">
            <ShoppingCart className="w-16 h-16 text-[#9e8e8c]/50 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-[#1c1b1b] mb-2">Keranjang Kosong</h2>
            <p className="text-sm text-[#5b403e] mb-6">
              Belum ada layanan di keranjang Anda. Yuk, cari jasa yang Anda butuhkan!
            </p>
            <Button className="bg-[#b51822] hover:bg-[#90121a] rounded" onClick={() => router.push('/search')}>
              Cari Jasa
            </Button>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.partner_username} className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden">
                {/* Partner header */}
                <Link
                  href={`/${group.partner_username}`}
                  className="flex items-center justify-between px-4 py-3 bg-[#fcfafa] border-b border-[#e5e2e1] hover:bg-[#f7f5f4]"
                >
                  <span className="text-sm font-semibold text-[#1c1b1b]">@{group.partner_username}</span>
                  <ChevronRight className="w-4 h-4 text-[#9e8e8c]" />
                </Link>

                {/* Items — kartu horizontal yang sama dengan halaman booking */}
                <div className="p-3 space-y-2">
                  {group.items.map((item) => (
                    <ServiceItemCard
                      key={item.service_id}
                      name={item.service_name}
                      price={item.price}
                      photoUrl={item.photo_url || undefined}
                      action={
                        <button
                          onClick={() => removeItem(item.service_id)}
                          className="p-2 text-[#9e8e8c] hover:text-[#E53E3E] hover:bg-[#FFF5F5] rounded-lg shrink-0 transition-colors"
                          aria-label={`Hapus ${item.service_name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      }
                    />
                  ))}
                </div>

                {/* Group footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#e5e2e1] bg-[#fcfafa]">
                  <div>
                    <p className="text-xs text-[#9e8e8c]">Subtotal ({group.items.length} layanan)</p>
                    <p className="text-base font-bold text-[#b51822]">{formatPrice(group.subtotal)}</p>
                  </div>
                  <Button
                    className="bg-[#b51822] hover:bg-[#90121a] rounded px-6"
                    onClick={() => handleCheckout(group)}
                  >
                    Pesan
                  </Button>
                </div>
              </div>
            ))}

            {groups.length > 1 && (
              <p className="text-xs text-[#9e8e8c] text-center">
                Pemesanan dilakukan per mitra. Total semua keranjang: <span className="font-semibold">{formatPrice(total)}</span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

