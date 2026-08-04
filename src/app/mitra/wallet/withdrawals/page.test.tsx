import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import MitraWithdrawalsPage from './page';

/**
 * Test integrasi satu halaman terhadap API ber-mock (§14.2): success,
 * kosong, 4xx, 5xx.
 *
 * Yang dijaga di sini bukan tata letak, melainkan satu aturan produk yang
 * berulang kali dilanggar di repo ini: **gagal-memuat tidak boleh tampil
 * seperti "belum ada data"**. Mitra yang melihat "belum pernah menarik dana"
 * padahal requestnya gagal akan mengira riwayat penarikannya hilang.
 */
const fetchAPI = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({ fetchAPI }));
vi.mock('@/hooks/useRequireAuth', () => ({
  useRequireAuth: () => ({ isLoading: false, isAuthorized: true, isAuthenticated: true }),
}));
vi.mock('@/components/mitra/MitraPageHeader', () => ({ default: () => null }));

function withdrawal(over: Record<string, unknown> = {}) {
  return {
    id: 'w-1',
    amount: 500000,
    admin_fee: 3000,
    net_amount: 497000,
    bank_name: 'BCA',
    bank_code: 'BCA',
    account_number_masked: '****1234',
    account_name: 'BUDI SANTOSO',
    status: 'COMPLETED',
    requested_at: '2026-08-01T03:00:00Z',
    completed_at: '2026-08-02T03:00:00Z',
    ...over,
  };
}

describe('Halaman riwayat penarikan', () => {
  beforeEach(() => {
    fetchAPI.mockReset();
  });

  it('menampilkan penarikan beserta jumlah bersih dan rekening termasking', async () => {
    fetchAPI.mockResolvedValue({
      success: true,
      data: [withdrawal()],
      pagination: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });

    render(<MitraWithdrawalsPage />);

    await waitFor(() => expect(screen.getByText('Berhasil')).toBeTruthy());
    // Nomor rekening TIDAK boleh tampil utuh.
    expect(screen.getByText(/\*\*\*\*1234/)).toBeTruthy();
    expect(screen.queryByText(/1234567890/)).toBeNull();
  });

  it('menampilkan alasan penolakan bila ada', async () => {
    fetchAPI.mockResolvedValue({
      success: true,
      data: [withdrawal({ status: 'REJECTED', failure_reason: 'Nama rekening tidak cocok' })],
      pagination: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });

    render(<MitraWithdrawalsPage />);

    await waitFor(() => expect(screen.getByText('Ditolak')).toBeTruthy());
    // Alasan adalah SATU-SATUNYA hal yang bisa ditindaklanjuti mitra; kalau
    // hilang, ia hanya tahu gagal tanpa tahu harus memperbaiki apa.
    expect(screen.getByText(/Nama rekening tidak cocok/)).toBeTruthy();
  });

  it('daftar kosong menampilkan keadaan kosong, bukan error', async () => {
    fetchAPI.mockResolvedValue({
      success: true,
      data: [],
      pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
    });

    render(<MitraWithdrawalsPage />);

    await waitFor(() => expect(screen.getByText(/Belum ada penarikan dana/)).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each([
    ['4xx', { success: false, message: 'Sesi berakhir', status: 401 }],
    ['5xx', { success: false, message: 'Terjadi kesalahan pada server', status: 500 }],
    ['jaringan mati', { success: false, message: 'Koneksi bermasalah', status: 0 }],
  ])('%s tampil sebagai GAGAL MEMUAT, bukan "belum ada penarikan"', async (_label, res) => {
    fetchAPI.mockResolvedValue(res);

    render(<MitraWithdrawalsPage />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    // Inilah aturannya: keadaan kosong TIDAK boleh muncul saat request gagal.
    expect(screen.queryByText(/Belum ada penarikan dana/)).toBeNull();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeTruthy();
  });
});
