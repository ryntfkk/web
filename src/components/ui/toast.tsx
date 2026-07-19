"use client";

import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToastStore, type ToastType } from '@/lib/store/toastStore';
import { cn } from '@/lib/utils';

/**
 * Hook toast global. Ganti pola lama `const [toast,setToast]=useState()` +
 * `showToast` + JSX `{toast && ...}` yang dulu diduplikasi di belasan halaman.
 *
 * const { showToast } = useToast();
 * showToast('Tersimpan');            // success
 * showToast('Gagal', 'error');
 */
export function useToast() {
  const show = useToastStore((s) => s.show);
  return { showToast: show };
}

const TYPE_STYLES: Record<ToastType, { bg: string; icon: React.ElementType }> = {
  success: { bg: 'bg-brand-success', icon: CheckCircle },
  error: { bg: 'bg-brand-error', icon: XCircle },
  info: { bg: 'bg-brand-info', icon: Info },
};

/** Dipasang sekali di root layout. Merender semua toast aktif. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const { bg, icon: Icon } = TYPE_STYLES[t.type];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto w-full flex items-center gap-2.5 px-4 py-2.5 rounded-md text-white text-sm font-medium shadow-lg animate-fadeIn',
              bg,
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="p-0.5 -mr-1 rounded hover:bg-white/20 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
