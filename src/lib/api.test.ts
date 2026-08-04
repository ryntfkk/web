import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchAPI } from './api';
import { useAuthStore } from './store/authStore';

/**
 * Batas API adalah satu-satunya tempat envelope dirapikan (P1-12, `unwrapData`
 * sudah dihapus). Kalau lapisan ini salah, SETIAP halaman salah — dan salahnya
 * berupa "tidak ada data" yang tak bisa dibedakan dari kegagalan.
 *
 * Kasus yang diuji mengikuti §14.2: success, body kosong, 4xx, 5xx, dan
 * jaringan mati.
 */
function mockFetchOnce(init: { status: number; body?: string; ok?: boolean }) {
  const { status, body = '', ok = status >= 200 && status < 300 } = init;
  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: async () => body,
  });
}

describe('fetchAPI', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false } as never);
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('meneruskan envelope sukses apa adanya', async () => {
    globalThis.fetch = mockFetchOnce({
      status: 200,
      body: JSON.stringify({ success: true, data: { id: 'abc' }, message: 'ok' }),
    }) as never;

    const res = await fetchAPI<{ id: string }>('/anything');
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ id: 'abc' });
  });

  it('mempertahankan pagination dari respons berpaginasi', async () => {
    globalThis.fetch = mockFetchOnce({
      status: 200,
      body: JSON.stringify({
        success: true,
        data: [],
        pagination: { page: 2, per_page: 20, total: 47, total_pages: 3 },
      }),
    }) as never;

    const res = await fetchAPI('/wallet/withdrawals?page=2');
    // Total inilah yang membuat paginasi klien jujur; kalau hilang, tombol
    // "muat lebih banyak" berhenti terlalu cepat atau tak pernah berhenti.
    expect(res.pagination?.total).toBe(47);
  });

  // 204 dari mutasi sukses (mis. DELETE foto) TIDAK punya body. `response.json()`
  // akan melempar dan mengubah sukses jadi "Network error" palsu.
  it('memperlakukan 204 tanpa body sebagai sukses', async () => {
    globalThis.fetch = mockFetchOnce({ status: 204, body: '' }) as never;

    const res = await fetchAPI('/partners/me/portfolios/x');
    expect(res.success).toBe(true);
  });

  it('200 dengan body kosong tetap sukses', async () => {
    globalThis.fetch = mockFetchOnce({ status: 200, body: '' }) as never;

    const res = await fetchAPI('/anything');
    expect(res.success).toBe(true);
  });

  it('meneruskan pesan error dari 4xx', async () => {
    globalThis.fetch = mockFetchOnce({
      status: 400,
      body: JSON.stringify({
        success: false,
        message: 'Harga minimum layanan adalah Rp 50000',
        error: { code: 'VALIDATION_ERROR' },
      }),
    }) as never;

    const res = await fetchAPI('/partners/me/services');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Rp 50000');
  });

  // 5xx dari proxy/CDN sering berupa HTML, bukan JSON. Tanpa penanganan ini
  // komponen membaca `res.message` dan menampilkan string kosong.
  it('5xx tanpa body JSON tetap punya pesan ramah-pengguna', async () => {
    globalThis.fetch = mockFetchOnce({ status: 502, body: '<html>Bad Gateway</html>' }) as never;

    const res = await fetchAPI('/anything');
    expect(res.success).toBe(false);
    expect(res.message).toBeTruthy();
    expect(res.message).not.toBe('');
  });

  it('jaringan mati menghasilkan pesan, bukan lemparan', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await fetchAPI('/anything');
    expect(res.success).toBe(false);
    expect(res.status).toBe(0);
    expect(res.message).toContain('Koneksi');
  });

  it('mengirim header platform yang diwajibkan backend', async () => {
    const spy = mockFetchOnce({ status: 200, body: JSON.stringify({ success: true }) });
    globalThis.fetch = spy as never;

    await fetchAPI('/anything');

    const headers = spy.mock.calls[0][1].headers as Headers;
    // Backend menolak request tanpa dua header ini.
    expect(headers.get('X-Platform')).toBe('web');
    expect(headers.get('X-App-Version')).toBeTruthy();
  });
});
