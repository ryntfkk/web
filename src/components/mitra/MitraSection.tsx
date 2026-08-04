import type { ReactNode } from 'react';

/**
 * Satu blok berjudul di dalam halaman mitra (§6.4).
 *
 * `description` sengaja ada di komponennya, bukan diserahkan ke tiap halaman:
 * penjelasan satu baris di bawah judul adalah tempat menaruh konsekuensi ("yang
 * dinonaktifkan tidak muncul di pencarian"), dan kalau tidak disediakan slotnya
 * penjelasan itu selalu hilang.
 */
interface MitraSectionProps {
  title: string;
  description?: string;
  /** Aksi di sisi kanan judul (mis. "Lihat semua"). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Bungkus isi dengan kartu putih. Default false — banyak isi sudah berupa kartu sendiri. */
  card?: boolean;
}

export default function MitraSection({
  title,
  description,
  action,
  children,
  className = '',
  card = false,
}: MitraSectionProps) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-brand-gray-900 lg:text-base">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs leading-snug text-brand-gray-450">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {card ? (
        <div className="rounded-lg border border-brand-gray-100 bg-white p-4 shadow-sm lg:p-5">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}
