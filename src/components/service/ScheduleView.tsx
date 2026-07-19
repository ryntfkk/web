'use client';

import { Clock, CalendarOff } from 'lucide-react';
import type { WorkingHour } from '@/hooks/useServiceDetail';

const DAY_NAMES: Record<string, string> = {
  monday: 'Senin',
  tuesday: 'Selasa',
  wednesday: 'Rabu',
  thursday: 'Kamis',
  friday: 'Jumat',
  saturday: 'Sabtu',
  sunday: 'Minggu',
};

const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

function formatTime(t: string): string {
  // Backend menyerialisasi kolom TIME sebagai RFC3339 ("0000-01-01T08:00:00Z")
  // atau "HH:MM:SS" — ambil komponen jam:menit di mana pun posisinya
  // (regex tidak boleh ter-anchor di awal string).
  const match = t.match(/(\d{2}):(\d{2})/);
  if (!match) return t;
  return `${match[1]}:${match[2]}`;
}

interface ScheduleViewProps {
  workingHours: WorkingHour[] | undefined;
  isLoading: boolean;
}

export default function ScheduleView({
  workingHours,
  isLoading,
}: ScheduleViewProps) {
  if (isLoading) {
    return (
      <div className="rounded-xs border border-[#e5e2e1] bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-[#5b403e]" />
          <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#1c1b1b]">
            Jadwal Mitra
          </h3>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-[28px] bg-gray-100 animate-pulse rounded-md"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!workingHours || workingHours.length === 0) {
    return (
      <div className="rounded-xs border border-[#e5e2e1] bg-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarOff className="w-4 h-4 text-[#8f6f6d]" />
          <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#1c1b1b]">
            Jadwal Mitra
          </h3>
        </div>
        <p className="text-[12px] sm:text-[13px] text-[#8f6f6d]">
          Jam kerja belum ditentukan.
        </p>
      </div>
    );
  }

  // Sort by day order
  const sorted = [...workingHours].sort(
    (a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week),
  );

  return (
    <div className="rounded-xs border border-[#e5e2e1] bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-[#5b403e]" />
        <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#1c1b1b]">
          Jadwal Mitra
        </h3>
      </div>

      <div className="divide-y divide-[#e5e2e1]">
        {sorted.map((wh) => (
          <div
            key={wh.id || wh.day_of_week}
            className="flex items-center justify-between py-1.5 text-[13px] sm:text-[14px]"
          >
            <span className="font-medium text-[#1c1b1b] min-w-[60px]">
              {DAY_NAMES[wh.day_of_week] || wh.day_of_week}
            </span>
            <span className="text-[#5b403e]">
              {wh.is_open
                ? `${formatTime(wh.open_time)} - ${formatTime(wh.close_time)}`
                : '—'}
            </span>
            <span
              className={`text-[12px] font-medium min-w-[44px] text-right ${
                wh.is_open ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {wh.is_open ? 'Buka' : 'Tutup'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
