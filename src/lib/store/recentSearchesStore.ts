import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX = 8;

interface RecentSearchesState {
  terms: string[];
  /** Simpan kata kunci pencarian (paling baru di depan, dedup case-insensitive, cap 8). */
  record: (term: string) => void;
  remove: (term: string) => void;
  clear: () => void;
}

export const useRecentSearchesStore = create<RecentSearchesState>()(
  persist(
    (set) => ({
      terms: [],
      record: (term) => {
        const t = term.trim();
        if (!t) return;
        set((state) => ({
          terms: [t, ...state.terms.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX),
        }));
      },
      remove: (term) =>
        set((state) => ({ terms: state.terms.filter((x) => x !== term) })),
      clear: () => set({ terms: [] }),
    }),
    { name: 'posko-recent-searches' },
  ),
);
