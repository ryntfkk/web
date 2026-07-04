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

export function StarRating({
  value = 0,
  onChange,
  readonly = false,
  size = 'md',
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const starSize = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  const gap = { sm: 'gap-0.5', md: 'gap-1', lg: 'gap-1.5' }[size];

  return (
    <div className={cn('flex items-center', gap, className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hovered ? star <= hovered : star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            className={cn(
              'transition-transform',
              !readonly && 'hover:scale-110 cursor-pointer',
              readonly && 'cursor-default'
            )}
            aria-label={`Beri rating ${star} bintang`}
          >
            <Star
              className={cn(
                starSize,
                'transition-colors',
                filled ? 'fill-[#D69E2E] text-[#D69E2E]' : 'fill-transparent text-[#e5e2e1]'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
