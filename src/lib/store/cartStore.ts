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
  /**
   * Jumlah unit. Opsional karena keranjang dipersist di localStorage: item yang
   * masuk sebelum kolom ini ada tetap harus bisa dirender (dianggap `min_order`,
   * atau 1).
   *
   * Sebelum ini keranjang TIDAK mengenal kuantitas sama sekali . `addItem`
   * menolak duplikat dan subtotal menjumlahkan harga satuan. Untuk layanan
   * `min_order > 1`, halaman booking otomatis memakai `min_order` sebagai
   * kuantitas awal, sehingga **total di keranjang lebih kecil daripada yang
   * benar-benar ditagih di checkout** (audit E4).
   */
  quantity?: number;
  /** Minimal order layanan . batas bawah stepper, dan default kuantitas. */
  min_order?: number;
}

interface CartState {
  items: CartItem[];
  itemCount: number;
  addItem: (item: CartItem) => void;
  /** Ubah jumlah satu baris. Nilai di bawah `min_order` dijepit ke `min_order`. */
  setQuantity: (serviceId: string, variationId: string | undefined, quantity: number) => void;
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

/** Batas atas kuantitas . sama dengan stepper di halaman booking. */
const MAX_QTY = 100;

/** `min_order` efektif; minimal 1 walau backend mengirim 0/undefined. */
export const minOrderOf = (i: Pick<CartItem, 'min_order'>) => Math.max(1, i.min_order ?? 1);

/** Kuantitas efektif satu baris . item lama tanpa `quantity` jatuh ke min_order. */
export const lineQty = (i: Pick<CartItem, 'quantity' | 'min_order'>) =>
  Math.max(minOrderOf(i), i.quantity ?? minOrderOf(i));

/** Harga satu baris = satuan × kuantitas. */
export const lineTotal = (i: Pick<CartItem, 'price' | 'quantity' | 'min_order'>) =>
  i.price * lineQty(i);

/**
 * Total sekumpulan baris.
 *
 * SATU rumus untuk halaman keranjang DAN test-nya . kalau halaman menghitung
 * sendiri, test hanya menguji salinan rumusnya dan bug asli tetap lolos. Itu
 * persis yang terjadi pada E4: subtotal lama menjumlahkan `item.price` tanpa
 * mengalikannya dengan kuantitas.
 */
export const cartTotal = (items: Pick<CartItem, 'price' | 'quantity' | 'min_order'>[]) =>
  items.reduce((sum, i) => sum + lineTotal(i), 0);

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      itemCount: 0,

      addItem: (item) => {
        const exists = get().items.some((i) => sameLine(i, item.service_id, item.variation_id));
        if (!exists) {
          set((state) => {
            const items = [...state.items, { ...item, quantity: lineQty(item) }];
            return { items, itemCount: items.length };
          });
        }
      },

      setQuantity: (serviceId, variationId, quantity) => {
        set((state) => ({
          items: state.items.map((i) =>
            sameLine(i, serviceId, variationId)
              ? { ...i, quantity: Math.max(minOrderOf(i), Math.min(MAX_QTY, quantity)) }
              : i,
          ),
        }));
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
