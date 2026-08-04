import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import MitraServicesPage from './page';

/**
 * Halaman layanan (§14.2). Dua aturan produk yang dijaga di sini:
 *
 * 1. Gagal-memuat ≠ "belum ada layanan" (P1-11).
 * 2. Toggle aktif/nonaktif memakai keadaan dari SERVER, bukan negasi lokal
 *    (P0-01). Kalau server menolak, layar tidak boleh menampilkan keadaan
 *    yang tidak nyata — mitra akan mengira layanannya tayang padahal tidak.
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
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const service = {
  id: 's-1',
  name: 'Cuci AC 1 PK',
  price: 150000,
  estimated_duration: 60,
  description: 'Cuci evaporator',
  is_active: true,
};

describe('Halaman layanan mitra', () => {
  beforeEach(() => {
    fetchAPI.mockReset();
    showToast.mockReset();
  });

  it('menampilkan daftar layanan', async () => {
    fetchAPI.mockResolvedValue({ success: true, data: [service] });
    render(<MitraServicesPage />);
    await waitFor(() => expect(screen.getByText('Cuci AC 1 PK')).toBeTruthy());
  });

  it('daftar kosong menampilkan ajakan menambah layanan', async () => {
    fetchAPI.mockResolvedValue({ success: true, data: [] });
    render(<MitraServicesPage />);
    await waitFor(() => expect(screen.getByText(/belum menambahkan layanan/i)).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each([
    ['4xx', { success: false, message: 'Sesi berakhir' }],
    ['5xx', { success: false, message: 'Terjadi kesalahan pada server' }],
  ])('%s tampil sebagai gagal memuat, bukan daftar kosong', async (_l, res) => {
    fetchAPI.mockResolvedValue(res);
    render(<MitraServicesPage />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByText(/belum menambahkan layanan/i)).toBeNull();
  });

  // Inti P0-01: server yang menolak perubahan tidak boleh menghasilkan UI yang
  // menunjukkan perubahan itu terjadi.
  it('toggle yang DITOLAK server tidak mengubah tampilan', async () => {
    fetchAPI
      .mockResolvedValueOnce({ success: true, data: [service] })
      .mockResolvedValueOnce({ success: false, message: 'Layanan sedang dipesan' });

    render(<MitraServicesPage />);
    await waitFor(() => expect(screen.getByText('Cuci AC 1 PK')).toBeTruthy());

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Layanan sedang dipesan', 'error'));
    // Tetap aktif — keadaan server yang menang, bukan niat klik.
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  });

  it('toggle memakai is_active dari respons server, bukan negasi lokal', async () => {
    fetchAPI
      .mockResolvedValueOnce({ success: true, data: [service] })
      // Server membalas TETAP aktif walau klien meminta nonaktif.
      .mockResolvedValueOnce({ success: true, data: { id: 's-1', is_active: true } });

    render(<MitraServicesPage />);
    await waitFor(() => expect(screen.getByText('Cuci AC 1 PK')).toBeTruthy());

    fireEvent.click(screen.getByRole('checkbox'));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Layanan diaktifkan'));
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  });
});
