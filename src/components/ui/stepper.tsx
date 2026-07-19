import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperProps {
  /** Label tiap langkah, urut. */
  steps: string[];
  /** Langkah aktif (1-based). */
  current: number;
  className?: string;
}

/**
 * Indikator progres multi-langkah horizontal (brand palette).
 * Lingkaran terisi = selesai (centang), aktif = merah, belum = abu-abu.
 */
export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      {steps.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <div key={label} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  done && 'bg-[#b51822] text-white',
                  active && 'bg-[#b51822] text-white ring-4 ring-[#b51822]/15',
                  !done && !active && 'bg-white text-[#8f6f6d] border border-[#e5e2e1]',
                )}
              >
                {done ? <Check className="w-4 h-4" /> : n}
              </div>
              <span
                className={cn(
                  'text-[11px] font-medium whitespace-nowrap',
                  active || done ? 'text-[#1c1b1b]' : 'text-[#8f6f6d]',
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-0.5 flex-1 mx-2 -mt-5 rounded-full transition-colors', done ? 'bg-[#b51822]' : 'bg-[#e5e2e1]')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
