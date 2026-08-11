import { beforeEach, describe, expect, it } from 'vitest';

import { useCartStore, lineQty, cartTotal, minOrderOf, type CartItem } from './cartStore';

/**
 * Keranjang menyangkut UANG, dan bug yang dijaga di sini nyata:
 *
 * sampai 2026-08-11 `CartItem` tidak punya `quantity` sama sekali dan subtotal
 * menjumlahkan harga SATUAN. Halaman booking, sementara itu, menetapkan
 * kuantitas awal = `min_order` layanan. Untuk layanan `min_order > 1` angka di
 * keranjang karena itu LEBIH KECIL daripada yang benar-benar ditagih di
 * checkout . pelanggan menyetujui satu angka lalu membayar angka lain (E4).
 */
const base: CartItem = {
  service_id: 'svc-1',
  partner_id: 'p-1',
  partner_username: 'budi',
  service_name: 'Cuci AC',
  price: 150_000,
  photo_url: '',
};

function reset() {
  useCartStore.setState({ items: [], itemCount: 0 });
}

describe('kuantitas keranjang', () => {
  beforeEach(reset);

  it('item tanpa min_order berjumlah 1', () => {
    expect(lineQty({})).toBe(1);
    expect(minOrderOf({})).toBe(1);
  });

  it('item lama tanpa `quantity` jatuh ke min_order, bukan ke 1', () => {
    // Keranjang dipersist di localStorage: baris yang masuk SEBELUM kolom
    // `quantity` ada tetap harus dihitung benar.
    expect(lineQty({ min_order: 3 })).toBe(3);
  });

  it('min_order 0/undefined dari backend tetap dianggap 1', () => {
    expect(minOrderOf({ min_order: 0 })).toBe(1);
    expect(lineQty({ min_order: 0, quantity: 0 })).toBe(1);
  });

  it('addItem menyimpan kuantitas awal = min_order', () => {
    useCartStore.getState().addItem({ ...base, min_order: 5 });
    const item = useCartStore.getState().items[0];
    expect(lineQty(item)).toBe(5);
  });

  it('setQuantity tidak bisa turun di bawah min_order', () => {
    useCartStore.getState().addItem({ ...base, min_order: 3 });
    useCartStore.getState().setQuantity('svc-1', undefined, 1);
    expect(lineQty(useCartStore.getState().items[0])).toBe(3);
  });

  it('setQuantity dijepit di batas atas 100', () => {
    useCartStore.getState().addItem({ ...base });
    useCartStore.getState().setQuantity('svc-1', undefined, 999);
    expect(lineQty(useCartStore.getState().items[0])).toBe(100);
  });

  it('setQuantity hanya menyentuh baris dengan variasi yang cocok', () => {
    // Identitas baris = (service_id, variation_id). Dua variasi dari layanan
    // yang sama adalah dua baris terpisah.
    useCartStore.getState().addItem({ ...base, variation_id: 'v1' });
    useCartStore.getState().addItem({ ...base, variation_id: 'v2' });
    useCartStore.getState().setQuantity('svc-1', 'v1', 4);

    const items = useCartStore.getState().items;
    expect(lineQty(items.find((i) => i.variation_id === 'v1')!)).toBe(4);
    expect(lineQty(items.find((i) => i.variation_id === 'v2')!)).toBe(1);
  });

  it('cartTotal MENGALIKAN harga dengan kuantitas . inilah bug E4', () => {
    // Sengaja memakai `cartTotal`, rumus yang SAMA dengan yang dipakai halaman
    // keranjang. Menghitung ulang di test hanya akan menguji salinan rumusnya,
    // dan bug aslinya tetap lolos.
    useCartStore.getState().addItem({ ...base, min_order: 3 });
    // 150.000 × 3, BUKAN 150.000.
    expect(cartTotal(useCartStore.getState().items)).toBe(450_000);
  });

  it('cartTotal menjumlahkan lintas baris & lintas variasi', () => {
    useCartStore.getState().addItem({ ...base, variation_id: 'v1', price: 100_000 });
    useCartStore.getState().addItem({ ...base, variation_id: 'v2', price: 250_000, min_order: 2 });
    // 100.000×1 + 250.000×2
    expect(cartTotal(useCartStore.getState().items)).toBe(600_000);
  });

  it('removeItem memakai identitas (service_id, variation_id)', () => {
    useCartStore.getState().addItem({ ...base, variation_id: 'v1' });
    useCartStore.getState().addItem({ ...base, variation_id: 'v2' });
    useCartStore.getState().removeItem('svc-1', 'v1');

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].variation_id).toBe('v2');
    expect(useCartStore.getState().itemCount).toBe(1);
  });
});
