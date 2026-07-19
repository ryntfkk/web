import { cn } from '@/lib/utils';

/** Blok skeleton loading standar. Contoh: <Skeleton className="h-4 w-32" /> */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-[#e5e2e1]', className)}
      {...props}
    />
  );
}
