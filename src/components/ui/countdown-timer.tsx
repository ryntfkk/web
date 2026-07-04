"use client";

import { useEffect, useState, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetDate: Date | string | number;
  onExpire?: () => void;
  format?: 'mm:ss' | 'hh:mm:ss' | 'hh:mm:ss:ms';
  className?: string;
  showIcon?: boolean;
  criticalThresholdSeconds?: number; // default 300 (5 min)
  warningThresholdSeconds?: number;  // default 1800 (30 min)
}

function formatTime(totalSeconds: number, format: string) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (format === 'mm:ss') {
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CountdownTimer({
  targetDate,
  onExpire,
  format = 'mm:ss',
  className,
  showIcon = true,
  criticalThresholdSeconds = 300,
  warningThresholdSeconds = 1800,
}: CountdownTimerProps) {
  const getSecondsLeft = useCallback(() => {
    const target = new Date(targetDate).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((target - now) / 1000));
  }, [targetDate]);

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft);

  useEffect(() => {
    setSecondsLeft(getSecondsLeft());
    const interval = setInterval(() => {
      const remaining = getSecondsLeft();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [getSecondsLeft, onExpire]);

  const isCritical = secondsLeft <= criticalThresholdSeconds;
  const isWarning = !isCritical && secondsLeft <= warningThresholdSeconds;
  const isExpired = secondsLeft <= 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold tabular-nums',
        isCritical && !isExpired && 'text-[#E53E3E] animate-pulse',
        isWarning && 'text-[#DD6B20]',
        !isCritical && !isWarning && 'text-[#1c1b1b]',
        isExpired && 'text-[#9e8e8c]',
        className
      )}
    >
      {showIcon && <Clock className="w-4 h-4 shrink-0" />}
      {isExpired ? 'Waktu Habis' : formatTime(secondsLeft, format)}
    </span>
  );
}
