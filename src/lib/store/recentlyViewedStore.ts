import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ViewedService {
  service_id: string;
  service_name: string;
  price: number;
  photo_url: string;
  partner_username?: string;
  category_name?: string;
  /** Data mitra . dipakai agar kartu "Baru Dilihat" tampil sama dengan kartu
   *  produk jasa di section lain. Opsional: entri lama di localStorage belum
   *  memilikinya, kartu tetap dirender dengan nilai default. */
  partner_name?: string;
  partner_avatar_url?: string;
  partner_avg_rating?: number;
  partner_city?: string;
}

const MAX = 10;

interface RecentlyViewedState {
  items: ViewedService[];
  /** Catat layanan yang baru dilihat (paling baru di depan, dedup, cap 10). */
  record: (item: ViewedService) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      record: (item) =>
        set((state) => ({
          items: [item, ...state.items.filter((i) => i.service_id !== item.service_id)].slice(0, MAX),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: 'posko-recently-viewed' },
  ),
);
