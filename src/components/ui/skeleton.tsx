import { cn } from '@/lib/utils';

/** Blok skeleton loading standar. Contoh: <Skeleton className="h-4 w-32" /> */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-brand-gray-100', className)}
      {...props}
    />
  );
}

/** Skeleton level halaman untuk authLoading / gate check. Ringkas, bukan spinner. */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('page-h bg-brand-gray-60', className)}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-lg border border-brand-gray-100 bg-white p-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton kartu layanan . bentuk mengikuti ServiceCard vertikal. */
export function ServiceCardSkeleton() {
  return (
    <div className="rounded-lg border border-brand-gray-100 bg-white overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-2.5 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/** Grid skeleton kartu layanan . jumlah & kolom mengikuti grid listing standar. */
export function ServiceGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ServiceCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton kartu order/transaksi (list). */
export function OrderCardSkeleton() {
  return (
    <div className="rounded-lg border border-brand-gray-100 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="w-16 h-16 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-brand-gray-100">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}

/** Skeleton list chat/notifikasi. */
export function ListItemSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="divide-y divide-brand-gray-100">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton halaman profil (header + menu). */
export function ProfileSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-20 h-20 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
      <ListItemSkeleton count={5} />
    </div>
  );
}
