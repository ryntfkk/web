import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ScheduleView from './ScheduleView';
import type { WorkingHour } from '@/hooks/useServiceDetail';

function hour(over: Partial<WorkingHour>): WorkingHour {
  return {
    id: over.day_of_week ?? 'x',
    day_of_week: 'monday',
    open_time: '08:00:00',
    close_time: '17:00:00',
    is_open: true,
    ...over,
  } as WorkingHour;
}

describe('ScheduleView', () => {
  it('menerjemahkan 00:00-23:59 menjadi "24 Jam"', () => {
    // Mitra yang buka nonstop menyimpannya begitu . jam 24 ditolak parser Go,
    // validator batch, DAN check constraint tabelnya. Tanpa terjemahan ini
    // pelanggan membaca "00:00 - 23:59" dan harus menyimpulkan sendiri.
    render(
      <ScheduleView
        isLoading={false}
        workingHours={[hour({ day_of_week: 'monday', open_time: '00:00:00', close_time: '23:59:00' })]}
      />,
    );

    expect(screen.getByText('24 Jam')).toBeTruthy();
    expect(screen.queryByText('00:00 - 23:59')).toBeNull();
  });

  it('jam biasa tetap tampil sebagai rentang', () => {
    render(
      <ScheduleView isLoading={false} workingHours={[hour({ day_of_week: 'tuesday' })]} />,
    );

    expect(screen.getByText('08:00 - 17:00')).toBeTruthy();
  });

  it('menerima format RFC3339 dari backend, bukan hanya HH:MM:SS', () => {
    // Kolom TIME diserialisasi sebagai "0000-01-01T00:00:00Z" di sebagian
    // endpoint . kalau regex-nya ter-anchor di awal, 24 jam tidak pernah dikenali.
    render(
      <ScheduleView
        isLoading={false}
        workingHours={[
          hour({
            day_of_week: 'wednesday',
            open_time: '0000-01-01T00:00:00Z',
            close_time: '0000-01-01T23:59:00Z',
          }),
        ]}
      />,
    );

    expect(screen.getByText('24 Jam')).toBeTruthy();
  });

  it('hari tutup tidak menampilkan jam', () => {
    render(
      <ScheduleView
        isLoading={false}
        workingHours={[hour({ day_of_week: 'sunday', is_open: false })]}
      />,
    );

    expect(screen.getAllByText('Tutup').length).toBeGreaterThan(0);
    expect(screen.queryByText('08:00 - 17:00')).toBeNull();
  });
});
