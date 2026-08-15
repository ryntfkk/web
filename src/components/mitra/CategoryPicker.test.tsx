import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import CategoryPicker from './CategoryPicker';
import type { PartnerCategoriesData } from '@/hooks/usePartnerCategories';

/**
 * CategoryPicker adalah tempat aturan slot kategori bertemu mitra (000080).
 *
 * Yang dijaga di sini bukan tampilan, melainkan tiga keputusan yang salahnya
 * baru ketahuan setelah mitra mengisi seluruh form dan ditolak server:
 *
 *  1. kategori utama TIDAK boleh bebas dipilih . hanya slot milik mitra;
 *  2. mitra tanpa slot diarahkan mengurusnya, bukan diberi dropdown kosong;
 *  3. kategori yang dimatikan admin tetap bisa disunting, tapi mitra
 *     diberi tahu layanannya belum tampil.
 */

const { fetchAPI } = vi.hoisted(() => ({ fetchAPI: vi.fn() }));
vi.mock('@/lib/api', () => ({ fetchAPI }));

function makeData(overrides: Partial<PartnerCategoriesData> = {}): PartnerCategoriesData {
  return {
    categories: [],
    quota: 1,
    used: 0,
    partner_type: 'individual',
    can_release: false,
    pending_request: null,
    ...overrides,
  };
}

const slot = (id: string, name: string, is_visible = true) => ({
  category_id: id,
  category_name: name,
  category_slug: name.toLowerCase(),
  icon_url: '',
  is_visible,
  evidence_urls: [],
  source: 'onboarding' as const,
  granted_at: '2026-08-09T00:00:00Z',
});

/** Membalas endpoint kategori mitra; sisanya (subkategori) dianggap kosong. */
function mockAPI(data: PartnerCategoriesData) {
  fetchAPI.mockImplementation(async (path: string) => {
    if (path === '/partners/me/categories') return { success: true, data };
    return { success: true, data: [] };
  });
}

function renderPicker(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  fetchAPI.mockReset();
});

describe('CategoryPicker', () => {
  it('mitra tanpa kategori diarahkan mengaturnya, BUKAN diberi daftar kosong', async () => {
    mockAPI(makeData());
    renderPicker(<CategoryPicker value="" onChange={() => {}} />);

    // Tanpa slot, apa pun yang dipilih akan ditolak backend
    // (CATEGORY_NOT_ALLOWED). Dropdown kosong membuat mitra menebak-nebak.
    expect(await screen.findByText('Kamu belum punya kategori layanan')).toBeTruthy();
    const cta = screen.getByRole('link', { name: /atur kategori layanan/i });
    expect(cta.getAttribute('href')).toBe('/mitra/profile#kategori');
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('slot tunggal TERKUNCI . tidak dirender sebagai pilihan', async () => {
    mockAPI(makeData({ categories: [slot('c1', 'Kebersihan')], used: 1 }));
    const onChange = vi.fn();
    renderPicker(<CategoryPicker value="" onChange={onChange} />);

    expect(await screen.findByText('Kebersihan')).toBeTruthy();
    // Mitra berkuota 1 tak punya pilihan untuk dibuat; dropdown berisi satu
    // opsi hanya menambah langkah.
    expect(screen.queryByLabelText('Kategori Utama')).toBeNull();
    // Slot tunggalnya dipasang otomatis ke form.
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('c1'));
  });

  it('hanya menawarkan SLOT MITRA, bukan seluruh kategori platform', async () => {
    mockAPI(
      makeData({
        categories: [slot('c1', 'Kebersihan'), slot('c2', 'Otomotif')],
        quota: 3,
        used: 2,
        partner_type: 'vendor',
      }),
    );
    renderPicker(<CategoryPicker value="" onChange={() => {}} />);

    const select = (await screen.findByLabelText('Kategori Utama')) as HTMLSelectElement;
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toEqual(['Pilih Kategori', 'Kebersihan', 'Otomotif']);

    // Yang paling penting: komponen TIDAK pernah memanggil /categories .
    // daftar kategori platform tidak boleh jadi sumber pilihan di sini.
    const paths = fetchAPI.mock.calls.map((c) => c[0]);
    expect(paths).not.toContain('/categories');
  });

  it('memberi tahu bila kategori mitra sedang dinonaktifkan admin', async () => {
    mockAPI(makeData({ categories: [slot('c1', 'Dapur & Kuliner', false)], used: 1 }));
    renderPicker(<CategoryPicker value="c1" mainCategoryId="c1" onChange={() => {}} />);

    // Tanpa ini mitra hanya melihat pesanannya berhenti datang dan menyalahkan
    // platform . layanannya memang tidak tampil, tapi tidak ada yang bilang.
    expect(
      await screen.findByText(/sedang dinonaktifkan admin/i),
    ).toBeTruthy();
  });

  it('mode edit TIDAK meresolusi lewat GET /categories/{id} . endpoint itu kini 404 untuk kategori mati', async () => {
    mockAPI(makeData({ categories: [slot('c1', 'Kebersihan')], used: 1 }));
    renderPicker(<CategoryPicker value="sub-9" mainCategoryId="c1" onChange={() => {}} />);

    await screen.findByText('Kebersihan');
    const paths = fetchAPI.mock.calls.map((c) => c[0] as string);
    expect(paths.some((p) => /^\/categories\/[^/]+$/.test(p))).toBe(false);
  });
});
