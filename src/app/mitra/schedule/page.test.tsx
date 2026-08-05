import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import MitraSchedulePage from './page';

/**
 * Jadwal 24 jam (§C).
 *
 * Yang dijaga di sini adalah representasinya, bukan tampilannya. "Buka 24 jam"
 * HARUS dikirim sebagai `00:00`-`23:59`; `24:00` ditolak tiga kali oleh backend
 * (parser `time.Parse`, `validateWorkingHoursBatch`, dan CHECK constraint
 * `close_time > open_time`), dan `00:00`-`00:00` ditolak oleh yang kedua.
 *
 * Aturan kedua yang dijaga: hari 24 jam TIDAK boleh membawa jeda istirahat.
 * Jeda tetap memblokir slot pemesanan, jadi "24 jam" yang menyisakan jeda
 * adalah janji yang dibatalkan sistemnya sendiri . dan UI-nya menyembunyikan
 * jeda itu, sehingga tak ada yang bisa melihat penyebabnya.
 */
const fetchAPI = vi.hoisted(() => vi.fn());
const showToast = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({ fetchAPI }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ showToast }) }));
vi.mock('@/hooks/useRequireAuth', () => ({
  useRequireAuth: () => ({
    isLoading: false,
    isAuthorized: true,
    isAuthenticated: true,
    user: { active_role: 'partner' },
  }),
}));
vi.mock('@/components/mitra/MitraPageHeader', () => ({ default: () => null }));

/** Jadwal tersimpan: Senin-Jumat 08:00-17:00 dengan jeda siang. */
function savedHours() {
  return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => ({
    day_of_week: day,
    open_time: '08:00:00',
    close_time: '17:00:00',
    is_open: true,
    break_start: '12:00:00',
    break_end: '13:00:00',
  }));
}

function mockLoad() {
  fetchAPI.mockImplementation((url: string) => {
    if (url === '/partners/me/working-hours') {
      return Promise.resolve({ success: true, data: savedHours() });
    }
    if (url === '/orders/summary') return Promise.resolve({ success: true, data: { active: 0 } });
    if (url === '/partners/me/time-off') return Promise.resolve({ success: true, data: [] });
    return Promise.resolve({ success: true, data: { updated: true, affected_orders_count: 0 } });
  });
}

/** Payload `hours` dari panggilan PUT batch terakhir. */
function savedPayload() {
  const call = fetchAPI.mock.calls.findLast(
    (c: unknown[]) => c[0] === '/partners/me/working-hours/batch',
  );
  expect(call, 'PUT batch tidak pernah dipanggil').toBeTruthy();
  return JSON.parse((call![1] as { body: string }).body).hours as Array<Record<string, unknown>>;
}

describe('Jadwal operasional . shortcut 24 jam', () => {
  beforeEach(() => {
    fetchAPI.mockReset();
    showToast.mockReset();
    mockLoad();
  });

  it('"Buka 24 Jam" mengenai ketujuh hari dan mengirim 00:00-23:59', async () => {
    render(<MitraSchedulePage />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Buka 24 Jam' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Buka 24 Jam' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Jadwal' }));

    const hours = await waitFor(savedPayload);
    expect(hours).toHaveLength(7);
    for (const h of hours) {
      expect(h.is_open).toBe(true);
      expect(h.open_time).toBe('00:00:00');
      expect(h.close_time).toBe('23:59:00');
      // Bukan 24:00 . `time.Parse` di backend menolaknya sebagai jam di luar rentang.
      expect(h.close_time).not.toBe('24:00:00');
      // Jeda WAJIB kosong, walau jadwal tersimpan tadi punya jeda 12:00-13:00.
      expect(h.break_start).toBe('');
      expect(h.break_end).toBe('');
    }
  });

  it('chip per-hari hanya mengubah hari itu', async () => {
    render(<MitraSchedulePage />);

    await waitFor(() => expect(screen.getByLabelText('Buka 24 jam Senin')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('Buka 24 jam Senin'));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Jadwal' }));

    const hours = await waitFor(savedPayload);
    const senin = hours.find(h => h.day_of_week === 'monday')!;
    const selasa = hours.find(h => h.day_of_week === 'tuesday')!;

    expect(senin.open_time).toBe('00:00:00');
    expect(senin.close_time).toBe('23:59:00');
    expect(senin.break_start).toBe('');

    // Selasa tidak ikut berubah . termasuk jeda siangnya.
    expect(selasa.open_time).toBe('08:00:00');
    expect(selasa.close_time).toBe('17:00:00');
    expect(selasa.break_start).toBe('12:00:00');
  });

  it('"Sen-Jum 08-17" menutup akhir pekan tanpa menyentuh hari kerja lain', async () => {
    render(<MitraSchedulePage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Sen.Jum 08.17/ })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Sen.Jum 08.17/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Jadwal' }));

    const hours = await waitFor(savedPayload);
    const byDay = Object.fromEntries(hours.map(h => [h.day_of_week, h]));

    expect(byDay.monday.is_open).toBe(true);
    expect(byDay.friday.is_open).toBe(true);
    expect(byDay.saturday.is_open).toBe(false);
    expect(byDay.sunday.is_open).toBe(false);
  });

  it('"Salin jam Senin" TIDAK diam-diam membuka hari yang tutup', async () => {
    render(<MitraSchedulePage />);

    // Sabtu & Minggu tidak ada di jadwal tersimpan → tetap default: tutup.
    await waitFor(() => expect(screen.getByRole('button', { name: /Salin jam Senin/ })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Salin jam Senin/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Jadwal' }));

    const hours = await waitFor(savedPayload);
    const minggu = hours.find(h => h.day_of_week === 'sunday')!;

    // Jamnya ikut Senin, tapi statusnya tetap tutup.
    expect(minggu.open_time).toBe('08:00:00');
    expect(minggu.close_time).toBe('17:00:00');
    expect(minggu.is_open).toBe(false);
  });

  it('hari 24 jam mengganti input jam dengan keterangan, bukan menyisakan 00:00/23:59', async () => {
    render(<MitraSchedulePage />);

    await waitFor(() => expect(screen.getByLabelText('Jam buka Senin')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('Buka 24 jam Senin'));

    expect(screen.queryByLabelText('Jam buka Senin')).toBeNull();
    expect(screen.getByLabelText('Buka 24 jam Senin').getAttribute('aria-pressed')).toBe('true');
    // Jeda tidak ditawarkan lagi untuk hari itu.
    expect(screen.queryByLabelText('Mulai istirahat Senin')).toBeNull();
  });
});
