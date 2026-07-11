import { create } from 'zustand';

// State UI untuk floating chat panel (desktop).
// Tidak dipersist — panel selalu tertutup saat halaman dimuat ulang.

interface ChatUiState {
  isPanelOpen: boolean;
  /** Room yang sedang dibuka di dalam panel; null = tampilkan daftar */
  activeRoomId: string | null;
  openPanel: (roomId?: string) => void;
  closePanel: () => void;
  togglePanel: () => void;
  selectRoom: (roomId: string) => void;
  backToList: () => void;
}

export const useChatUiStore = create<ChatUiState>((set) => ({
  isPanelOpen: false,
  activeRoomId: null,
  openPanel: (roomId) => set({ isPanelOpen: true, activeRoomId: roomId ?? null }),
  closePanel: () => set({ isPanelOpen: false }),
  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
  selectRoom: (roomId) => set({ activeRoomId: roomId }),
  backToList: () => set({ activeRoomId: null }),
}));
