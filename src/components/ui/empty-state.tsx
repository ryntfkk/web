import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** CTA opsional (mis. tombol "Cari Jasa"). */
  action?: React.ReactNode;
  className?: string;
}

/** Empty-state standar: ikon + judul + deskripsi + CTA opsional. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-12', className)}>
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-[#f0eded] flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-[#8f6f6d]" />
        </div>
      )}
      <h3 className="text-base font-semibold text-[#1c1b1b]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[#8f6f6d] max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
