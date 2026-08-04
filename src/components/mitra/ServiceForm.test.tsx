import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import ServiceForm, { EMPTY_SERVICE_FORM, type ServiceFormValues } from './ServiceForm';

// usePlatformConfig menembak API saat mount; harga minimum dikunci agar test
// menguji ATURANNYA, bukan nilai yang kebetulan ada di server.
vi.mock('@/hooks/usePlatformConfig', () => ({
  usePlatformConfig: () => ({ min_transaction: 50000 }),
  formatFeeRate: (v: number) => `${v}%`,
}));

vi.mock('@/lib/api', () => ({
  fetchAPI: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

// Editor turunan tidak relevan bagi aturan validasi dan menyeret banyak DOM.
vi.mock('@/components/mitra/CategoryPicker', () => ({
  default: () => null,
}));
vi.mock('@/components/ui/variations-editor', () => ({
  VariationsEditor: () => null,
}));
vi.mock('@/components/ui/requirements-editor', () => ({
  RequirementsEditor: () => null,
}));
vi.mock('@/components/ui/dynamic-faq-list', () => ({
  DynamicFaqList: () => null,
}));
vi.mock('@/components/ui/dynamic-string-list', () => ({
  DynamicStringList: () => null,
}));

function lengkap(overrides: Partial<ServiceFormValues> = {}): ServiceFormValues {
  return {
    ...EMPTY_SERVICE_FORM,
    name: 'Cuci AC 1 PK',
    category_id: 'cat-1',
    price: '75.000',
    duration_minutes: '60',
    min_order: '1',
    included_items: ['Cuci evaporator'],
    excluded_items: ['Isi freon'],
    ...overrides,
  };
}

function renderForm(values: ServiceFormValues, onSubmit = vi.fn()) {
  render(<ServiceForm initialValues={values} submitLabel="Simpan" onSubmit={onSubmit} />);
  return onSubmit;
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
}

/**
 * Aturan validasi layanan dulu ditulis DUA KALI — di halaman "tambah" dan
 * "edit" — dan berulang kali hanya diperbaiki di salah satunya. Sekarang satu
 * `ServiceForm`, dan test ini yang memastikan aturannya tidak diam-diam hilang.
 */
describe('ServiceForm — validasi', () => {
  it('mengirim payload bertipe angka saat semua terisi benar', () => {
    const onSubmit = renderForm(lengkap());
    submit();

    expect(onSubmit).toHaveBeenCalledOnce();
    const payload = onSubmit.mock.calls[0][0];
    // Harga terformat "75.000" harus jadi angka 75000, bukan string.
    expect(payload.price).toBe(75000);
    expect(payload.estimated_duration).toBe(60);
    expect(payload.min_order).toBe(1);
  });

  it('menolak harga di bawah minimum platform', () => {
    const onSubmit = renderForm(lengkap({ price: '10.000' }));
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/minimum/i);
  });

  // Durasi punya DUA lapis penjaga: atribut `min="15"` (validasi native
  // browser) dan aturan JS di handleSubmit. Yang penting bagi produk adalah
  // form tidak pernah terkirim — lapisan mana yang menahannya tidak relevan,
  // dan menuntut pesan error tertentu berarti menguji browser, bukan kode ini.
  it('tidak mengirim form bila durasi di bawah 15 menit', () => {
    const onSubmit = renderForm(lengkap({ duration_minutes: '10' }));
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('menolak bila include atau exclude kosong', () => {
    const onSubmit = renderForm(lengkap({ included_items: [] }));
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('menolak bila kategori belum dipilih', () => {
    const onSubmit = renderForm(lengkap({ category_id: '' }));
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  // per_hour: server meng-override durasi ke 60, jadi klien tidak boleh
  // menolaknya karena "kurang dari 15 menit" atau mengirim angka lain.
  it('per_hour mengunci durasi ke 60 menit dan lolos validasi durasi', () => {
    const onSubmit = renderForm(lengkap({ unit: 'per_hour', duration_minutes: '5' }));
    submit();

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][0].estimated_duration).toBe(60);
  });

  it('membersihkan spasi dan membuang baris kosong pada include/exclude', () => {
    const onSubmit = renderForm(
      lengkap({ included_items: ['  Cuci evaporator  ', '   ', ''], excluded_items: ['Isi freon'] }),
    );
    submit();

    expect(onSubmit.mock.calls[0][0].included_items).toEqual(['Cuci evaporator']);
  });

  it('min_order kosong dianggap 1, bukan 0', () => {
    const onSubmit = renderForm(lengkap({ min_order: '' }));
    submit();

    expect(onSubmit.mock.calls[0][0].min_order).toBe(1);
  });

  it('menampilkan error dari server yang diberikan pemanggil', () => {
    render(
      <ServiceForm
        initialValues={lengkap()}
        submitLabel="Simpan"
        error="Nama layanan sudah dipakai"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain('Nama layanan sudah dipakai');
  });
});
