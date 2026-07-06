'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, ShoppingCart, ArrowLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, removeItem, clearCart } = useCartStore();

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-[800px] px-4 py-8 flex-1">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
          <ShoppingCart className="w-12 h-12 text-[#8f6f6d]" />
          <h1 className="text-[20px] font-semibold text-[#1c1b1b]">
            Keranjang
          </h1>
          <p className="text-[14px] text-[#5b403e]">
            Silakan masuk untuk melihat keranjang Anda.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center font-bold text-[14px] rounded-[2px] bg-[#b51822] text-white hover:bg-[#90121a] h-[44px] px-6"
          >
            Masuk
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-[800px] px-4 py-8 flex-1">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
          <ShoppingCart className="w-12 h-12 text-[#8f6f6d]" />
          <h1 className="text-[20px] font-semibold text-[#1c1b1b]">
            Keranjang Kosong
          </h1>
          <p className="text-[14px] text-[#5b403e]">
            Belum ada layanan di keranjang. Jelajahi layanan yang tersedia.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center font-bold text-[14px] rounded-[2px] bg-[#b51822] text-white hover:bg-[#90121a] h-[44px] px-6"
          >
            Jelajahi Layanan
          </Link>
        </div>
      </div>
    );
  }

  // Group items by partner
  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="container mx-auto max-w-[800px] px-3 sm:px-4 py-4 sm:py-6 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[13px] sm:text-[14px] text-[#5b403e] hover:text-[#b51822]"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
        <h1 className="text-[18px] sm:text-[20px] font-semibold text-[#1c1b1b]">
          Keranjang ({items.length})
        </h1>
        <button
          onClick={clearCart}
          className="text-[12px] sm:text-[13px] text-red-500 hover:text-red-700"
        >
          Kosongkan
        </button>
      </div>

      {/* Item List */}
      <div className="flex flex-col gap-3 mb-24">
        {items.map((item) => (
          <div
            key={item.service_id}
            className="flex items-center gap-3 p-3 border border-[#e5e2e1] rounded-[4px] bg-white"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#e5e2e1] rounded-[4px] overflow-hidden flex-shrink-0">
              {item.photo_url && (
                <img
                  src={item.photo_url}
                  alt={item.service_name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] sm:text-[15px] font-semibold text-[#1c1b1b] line-clamp-1">
                {item.service_name}
              </p>
              <p className="text-[12px] sm:text-[13px] text-[#5b403e]">
                {item.partner_username}
              </p>
              <p className="text-[14px] sm:text-[15px] font-bold text-[#b51822] mt-1">
                Rp {item.price.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => removeItem(item.service_id)}
                className="text-[#8f6f6d] hover:text-red-500 transition-colors"
                title="Hapus"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <Button
                size="sm"
                className="text-[11px] sm:text-[12px] h-auto py-1 px-3 bg-[#b51822] hover:bg-[#90121a] text-white"
                onClick={() =>
                  router.push(
                    `/book/${item.partner_username}?service_id=${item.service_id}`,
                  )
                }
              >
                <Zap className="w-3 h-3 mr-1" />
                Pesan
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e5e2e1] px-3 sm:px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] sm:text-[12px] text-[#5b403e]">
            Total ({items.length} layanan)
          </p>
          <p className="text-[16px] sm:text-[18px] font-bold text-[#b51822]">
            Rp {totalPrice.toLocaleString('id-ID')}
          </p>
        </div>
        <Button
          className="text-[13px] sm:text-[14px] h-[44px] bg-[#b51822] hover:bg-[#90121a] text-white font-bold px-6"
          onClick={() => {
            // Navigate to first item's booking flow
            if (items.length === 1) {
              router.push(
                `/book/${items[0].partner_username}?service_id=${items[0].service_id}`,
              );
            }
            // For multiple items from different partners, go to first partner
          }}
        >
          Pesan Sekarang
        </Button>
      </div>
    </div>
  );
}
