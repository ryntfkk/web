import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import FilterPanel from './FilterPanel';

vi.mock('@/hooks/useCities', () => ({ useCities: () => ({ data: [] }) }));

function setup(overrides: Partial<React.ComponentProps<typeof FilterPanel>> = {}) {
  const props = {
    city: '',
    onCityChange: vi.fn(),
    minRating: 0,
    onMinRatingChange: vi.fn(),
    partnerType: '',
    onPartnerTypeChange: vi.fn(),
    minPrice: 0,
    onMinPriceChange: vi.fn(),
    maxPrice: 0,
    onMaxPriceChange: vi.fn(),
    ...overrides,
  };
  render(<FilterPanel {...props} />);
  return props;
}

/**
 * M2 . pertanyaan produk yang dijawab "YA": pelanggan boleh memilih berurusan
 * dengan perorangan atau badan usaha. Backend-nya sudah live sejak 2026-08-09;
 * filternya baru bisa dipakai setelah ada kontrolnya di sini.
 */
describe('FilterPanel . jenis mitra', () => {
  it('menawarkan ketiga pilihan dengan bahasa pelanggan, bukan istilah internal', () => {
    setup();
    expect(screen.getByText('Semua mitra')).toBeTruthy();
    expect(screen.getByText('Perorangan')).toBeTruthy();
    expect(screen.getByText('Badan usaha')).toBeTruthy();
    // "Individual"/"Vendor" adalah nilai enum internal, jangan bocor ke UI.
    expect(screen.queryByText('Vendor')).toBeNull();
  });

  it('mengirim nilai enum yang dimengerti backend saat dipilih', () => {
    const props = setup();
    fireEvent.click(screen.getByText('Badan usaha'));
    expect(props.onPartnerTypeChange).toHaveBeenCalledWith('vendor');
  });

  it('Reset Filter ikut mengosongkan jenis mitra', () => {
    const props = setup({ partnerType: 'vendor' });
    fireEvent.click(screen.getByRole('button', { name: /reset filter/i }));
    expect(props.onPartnerTypeChange).toHaveBeenCalledWith('');
  });

  it('tombol reset hidup walau HANYA jenis mitra yang aktif', () => {
    // Dulu `hasActiveFilter` hanya melihat kota & rating . filter yang tidak
    // ikut dihitung membuat tombol reset mati padahal ada filter menyala.
    setup({ partnerType: 'individual' });
    const reset = screen.getByRole('button', { name: /reset filter/i }) as HTMLButtonElement;
    expect(reset.disabled).toBe(false);
  });
});
