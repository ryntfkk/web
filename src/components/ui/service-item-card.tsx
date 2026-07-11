"use client";

import Image from 'next/image';
import { Check, Clock } from 'lucide-react';
import { PLACEHOLDER_SERVICE } from '@/lib/images';

function formatPrice(p: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(p);
}

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
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-[#f0eded] shrink-0">
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
        <p className="text-sm font-semibold text-[#1c1b1b] leading-snug line-clamp-2">{name}</p>
        {typeof durationMinutes === 'number' && durationMinutes > 0 && (
          <p className="text-xs text-[#9e8e8c] mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {durationMinutes} menit
          </p>
        )}
        <p className="text-sm font-bold text-[#b51822] mt-1">{formatPrice(price)}</p>
      </div>

      {/* Kanan: checkbox (selectable) atau slot aksi */}
      {selectable ? (
        <div
          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
            selected ? 'bg-[#b51822] border-[#b51822]' : 'border-[#d5d2d1] bg-white'
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

  const baseClass = `flex items-center gap-3 p-3 rounded-xl border transition-colors ${
    selectable
      ? selected
        ? 'border-[#b51822] bg-[#FFF5F5]'
        : 'border-[#e5e2e1] bg-white hover:border-[#b51822]/40'
      : 'border-[#e5e2e1] bg-white'
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
