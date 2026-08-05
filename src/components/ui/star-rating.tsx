"use client";

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value?: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STAR_SIZES = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' } as const;
const GAPS = { sm: 'gap-0.5', md: 'gap-1', lg: 'gap-1.5' } as const;

/**
 * Rating bintang. Dua mode:
 * - Interaktif (default): klik untuk memilih 1–5 (onChange).
 * - `readonly`: display saja; mendukung nilai pecahan (mis. 4.5) via overlay
 *   clip-width . setengah bintang terisi sesuai fraksi.
 */
export function StarRating({
  value = 0,
  onChange,
  readonly = false,
  size = 'md',
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const starSize = STAR_SIZES[size];
  const gap = GAPS[size];

  // Mode display (readonly): render bintang abu sebagai base, lalu overlay
  // bintang terisi yang lebarnya dipotong sesuai fraksi nilai.
  if (readonly) {
    const clamped = Math.min(5, Math.max(0, value));
    const fillPct = (clamped / 5) * 100;
    return (
      <div
        className={cn('relative inline-flex', className)}
        role="img"
        aria-label={`Rating ${clamped} dari 5 bintang`}
      >
        <div className={cn('flex items-center', gap)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(starSize, 'fill-transparent text-brand-gray-100')}
            />
          ))}
        </div>
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${fillPct}%` }}
          aria-hidden="true"
        >
          <div className={cn('flex items-center w-max', gap)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(starSize, 'fill-brand-warning text-brand-warning')}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', gap, className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hovered ? star <= hovered : star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 cursor-pointer"
            aria-label={`Beri rating ${star} bintang`}
          >
            <Star
              className={cn(
                starSize,
                'transition-colors',
                filled ? 'fill-brand-warning text-brand-warning' : 'fill-transparent text-brand-gray-100'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
