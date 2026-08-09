import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ────────────────────────────────────────────────────────────

export interface CartItem {
  service_id: string;
  partner_id: string;
  partner_username: string;
  /**
   * Nama tampil & badan hukum mitra (F-15). Opsional karena keranjang
   * dipersist di localStorage: item yang dimasukkan sebelum kolom ini ada tetap
   * harus bisa dirender, hanya tanpa baris penerima pembayaran.
   */
  partner_name?: string;
  partner_legal_name?: string;
  partner_type?: 'individual' | 'vendor';
  service_name: string;
  price: number;
  photo_url: string;
  // Variasi terpilih (opsional). price di atas = harga variasi bila ada.
  variation_id?: string;
  variation_name?: string;
}

interface CartState {
  items: CartItem[];
  itemCount: number;
  addItem: (item: CartItem) => void;
  // Identitas item keranjang = (service_id, variation_id). Variasi berbeda dari
  // layanan yang sama = item terpisah, jadi remove/isInCart butuh variation_id.
  removeItem: (serviceId: string, variationId?: string) => void;
  clearCart: () => void;
  isInCart: (serviceId: string, variationId?: string) => boolean;
}

// ── Store ────────────────────────────────────────────────────────────

// Dua item dianggap sama hanya bila service_id DAN variation_id sama.
// (variation_id undefined disamakan dengan '' agar layanan tanpa variasi konsisten.)
const sameLine = (i: CartItem, serviceId: string, variationId?: string) =>
  i.service_id === serviceId && (i.variation_id ?? '') === (variationId ?? '');

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      itemCount: 0,

      addItem: (item) => {
        const exists = get().items.some((i) => sameLine(i, item.service_id, item.variation_id));
        if (!exists) {
          set((state) => {
            const items = [...state.items, item];
            return { items, itemCount: items.length };
          });
        }
      },

      removeItem: (serviceId, variationId) => {
        set((state) => {
          const items = state.items.filter((i) => !sameLine(i, serviceId, variationId));
          return { items, itemCount: items.length };
        });
      },

      clearCart: () => set({ items: [], itemCount: 0 }),

      isInCart: (serviceId, variationId) =>
        get().items.some((i) => sameLine(i, serviceId, variationId)),
    }),
    { name: 'posko-cart' },
  ),
);
