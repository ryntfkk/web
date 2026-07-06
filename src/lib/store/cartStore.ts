import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ────────────────────────────────────────────────────────────

export interface CartItem {
  service_id: string;
  partner_id: string;
  partner_username: string;
  service_name: string;
  price: number;
  photo_url: string;
}

interface CartState {
  items: CartItem[];
  itemCount: number;
  addItem: (item: CartItem) => void;
  removeItem: (serviceId: string) => void;
  clearCart: () => void;
  isInCart: (serviceId: string) => boolean;
}

// ── Store ────────────────────────────────────────────────────────────

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      itemCount: 0,

      addItem: (item) => {
        const existing = get().items.find(
          (i) => i.service_id === item.service_id,
        );
        if (!existing) {
          set((state) => ({
            items: [...state.items, item],
            itemCount: state.itemCount + 1,
          }));
        }
      },

      removeItem: (serviceId) => {
        set((state) => ({
          items: state.items.filter((i) => i.service_id !== serviceId),
          itemCount: Math.max(0, state.itemCount - 1),
        }));
      },

      clearCart: () => set({ items: [], itemCount: 0 }),

      isInCart: (serviceId) =>
        get().items.some((i) => i.service_id === serviceId),
    }),
    { name: 'posko-cart' },
  ),
);
