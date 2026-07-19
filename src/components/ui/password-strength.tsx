import { cn } from '@/lib/utils';

/** Skor 0–4 dari panjang + ragam karakter. */
export function scorePassword(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const LEVELS = [
  { label: '', color: '' },
  { label: 'Lemah', color: 'bg-brand-error' },
  { label: 'Sedang', color: 'bg-brand-orange' },
  { label: 'Baik', color: 'bg-brand-info' },
  { label: 'Kuat', color: 'bg-brand-success' },
];

interface Props {
  password: string;
  className?: string;
}

/** Meter kekuatan password: 4 segmen + label. Sembunyi saat input kosong. */
export function PasswordStrength({ password, className }: Props) {
  const score = scorePassword(password);
  if (!password) return null;
  const level = LEVELS[score] ?? LEVELS[1];

  return (
    <div className={cn('mt-2', className)}>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= score ? level.color : 'bg-[#e5e2e1]')}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-[#8f6f6d]">
        Kekuatan: <span className="font-semibold text-[#5b403e]">{level.label}</span>
      </p>
    </div>
  );
}
