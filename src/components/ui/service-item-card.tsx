"use client";

import Image from 'next/image';
import { Check, Clock } from 'lucide-react';
import { PLACEHOLDER_SERVICE } from '@/lib/images';
import { Price } from '@/components/ui/price';

export interface ServiceItemCardProps {
  name: string;
  price: number;
  photoUrl?: string | null;
  /** Durasi dalam menit — opsional */
  durationMinutes?: number;
  /** Mode selectable (halaman booking): tampilkan checkbox & state terpilih */
  selected?: boolean;
  onSelect?: () => void;
  /** Slot aksi di kanan (mis. tombol hapus di keranjang). Diabaikan jika onSelect dipakai */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Kartu layanan horizontal — foto kiri, info di tengah, checkbox/aksi di kanan.
 * Dipakai di halaman booking (selectable) dan keranjang (dengan tombol aksi).
 */
export function ServiceItemCard({
  name,
  price,
  photoUrl,
  durationMinutes,
  selected = false,
  onSelect,
  action,
  className = '',
}: ServiceItemCardProps) {
  const selectable = typeof onSelect === 'function';

  const content = (
    <>
      {/* Foto */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-brand-red-light shrink-0">
        <Image
          src={photoUrl || PLACEHOLDER_SERVICE}
          alt={name}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-brand-gray-900 leading-snug line-clamp-2">{name}</p>
        {typeof durationMinutes === 'number' && durationMinutes > 0 && (
          <p className="text-xs text-brand-gray-450 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {durationMinutes} menit
          </p>
        )}
        <Price price={price} size="sm" className="mt-1" />
      </div>

      {/* Kanan: checkbox (selectable) atau slot aksi */}
      {selectable ? (
        <div
          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
            selected ? 'bg-brand-red border-brand-red' : 'border-brand-gray-200 bg-white'
          }`}
          aria-hidden="true"
        >
          {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </div>
      ) : (
        action ?? null
      )}
    </>
  );

  const baseClass = `flex items-center gap-3 p-3 rounded-lg border transition-colors ${
    selectable
      ? selected
        ? 'border-brand-red bg-brand-error-soft'
        : 'border-brand-gray-100 bg-white hover:border-brand-red/40'
      : 'border-brand-gray-100 bg-white'
  } ${className}`;

  if (selectable) {
    return (
      <button type="button" onClick={onSelect} aria-pressed={selected} className={`w-full cursor-pointer ${baseClass}`}>
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
