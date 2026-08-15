import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

/** Aksi opsional pada toast (mis. "Urungkan"). Klik = jalankan lalu tutup. */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastState {
  toasts: ToastItem[];
  /** Tampilkan toast; auto-hilang setelah `duration` ms (default 3000). */
  show: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => void;
  dismiss: (id: number) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (message, type = 'success', duration = 3000, action) => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, message, type, action }] }));
    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration);
    }
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
