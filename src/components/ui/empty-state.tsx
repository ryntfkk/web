import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** default: netral · error: aksen merah · success: aksen hijau · search: netral (hasil tak ditemukan) */
  variant?: 'default' | 'error' | 'success' | 'search';
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** CTA opsional (mis. tombol "Cari Jasa" atau "Coba Lagi"). */
  action?: React.ReactNode;
  className?: string;
}

const iconWrap: Record<NonNullable<EmptyStateProps['variant']>, string> = {
  default: 'bg-brand-red-light',
  search: 'bg-brand-red-light',
  error: 'bg-brand-error-soft',
  success: 'bg-brand-success-soft',
};

const iconColor: Record<NonNullable<EmptyStateProps['variant']>, string> = {
  default: 'text-brand-gray-400',
  search: 'text-brand-gray-400',
  error: 'text-brand-error',
  success: 'text-brand-success',
};

/** Empty-state standar: ikon + judul + deskripsi + CTA opsional. */
export function EmptyState({ variant = 'default', icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-12', className)}>
      {Icon && (
        <div className={cn('w-16 h-16 rounded-full flex items-center justify-center mb-4', iconWrap[variant])}>
          <Icon className={cn('w-8 h-8', iconColor[variant])} />
        </div>
      )}
      <h3 className="text-base font-semibold text-brand-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-brand-gray-400 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
