import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Kota terpilih untuk filter mitra di Home & Search.
// '' berarti "Semua Kota". Dipersist agar pilihan di Home terbawa ke Search.
interface CityFilterState {
  city: string;
  setCity: (city: string) => void;
}

export const useCityFilter = create<CityFilterState>()(
  persist(
    (set) => ({
      city: '',
      setCity: (city) => set({ city }),
    }),
    { name: 'posko-city-filter' },
  ),
);
