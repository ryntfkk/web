import type { ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Pita info/peringatan ringkas untuk mode mitra.
 *
 * Ada supaya densitasnya berhenti diketik ulang. Sebelum ini tiap halaman
 * menuliskan sendiri `bg-brand-*-soft border ... p-4 text-sm` dengan ikon di
 * sisinya . tinggi & warnanya jadi tidak seragam, dan yang paling sering
 * meleset justru padding (banner `p-4` di mobile memakan ruang yang dibutuhkan
 * konten). Default di sini **compact**: `px-3 py-2`, `text-xs`, ikon `w-4 h-4`.
 *
 * Varian memetakan ke token `brand-*` (lihat `globals.css`) . jangan menulis
 * hex atau palet Tailwind mentah; area mitra dijaga `design-tokens.test.ts`.
 */
export type MitraInfoBannerVariant = 'info' | 'warning' | 'error';

const VARIANTS: Record<MitraInfoBannerVariant, { wrap: string; icon: string }> = {
  info: {
    wrap: 'border-brand-info-light bg-brand-info-soft text-brand-info-dark',
    icon: 'text-brand-info',
  },
  warning: {
    wrap: 'border-brand-warning-border bg-brand-warning-soft text-brand-warning-dark',
    icon: 'text-brand-warning-dark',
  },
  error: {
    wrap: 'border-brand-error-border bg-brand-error-soft text-brand-error',
    icon: 'text-brand-error',
  },
};

const DEFAULT_ICON: Record<MitraInfoBannerVariant, ReactNode> = {
  info: <Info className="h-4 w-4" aria-hidden />,
  warning: <AlertTriangle className="h-4 w-4" aria-hidden />,
  error: <AlertTriangle className="h-4 w-4" aria-hidden />,
};

interface MitraInfoBannerProps {
  variant?: MitraInfoBannerVariant;
  /** Ganti ikon bawaan (mis. `Clock`). Set `null` untuk tanpa ikon. */
  icon?: ReactNode;
  /** Baris tebal pertama (opsional). */
  title?: string;
  /** Aksi di sisi kanan, mis. tombol "Coba lagi". */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Diteruskan ke elemen luar . pakai `role="alert"` untuk pita kegagalan. */
  role?: string;
}

export default function MitraInfoBanner({
  variant = 'info',
  icon,
  title,
  action,
  children,
  className = '',
  role,
}: MitraInfoBannerProps) {
  const v = VARIANTS[variant];
  const node = icon === undefined ? DEFAULT_ICON[variant] : icon;

  return (
    <div
      role={role}
      className={cn('flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-snug', v.wrap, className)}
    >
      {node && <span className={cn('mt-0.5 shrink-0', v.icon)}>{node}</span>}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5 font-medium' : 'font-medium'}>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
