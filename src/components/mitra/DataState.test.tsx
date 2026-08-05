import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import DataState from './DataState';

/**
 * Urutan cabang DataState adalah aturan produk, bukan detail implementasi
 * (§6.4, P1-11): `loading → error → empty → isi`.
 *
 * Menukar `error` dan `empty` adalah cara paling gampang menghadirkan kembali
 * bug aslinya . daftar kosong DAN gagal-memuat sama-sama berarti "tidak ada
 * baris", sehingga kegagalan request tampil sebagai "belum ada data" dan mitra
 * mengira pesanan/mutasi/layanannya hilang. Test ini yang menjaganya.
 */
describe('DataState', () => {
  it('menampilkan kerangka saat memuat, bukan isi', () => {
    render(
      <DataState isLoading skeleton={<div>memuat…</div>}>
        <div>isi asli</div>
      </DataState>,
    );

    expect(screen.getByText('memuat…')).toBeTruthy();
    expect(screen.queryByText('isi asli')).toBeNull();
  });

  it('mendahulukan error walau data kosong . INI inti bug P1-11', () => {
    render(
      <DataState isLoading={false} error="Koneksi terputus" isEmpty>
        <div>isi asli</div>
      </DataState>,
    );

    // Yang tampil harus kegagalan, BUKAN "belum ada data".
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Koneksi terputus')).toBeTruthy();
    expect(screen.queryByText('Belum ada data')).toBeNull();
  });

  it('menawarkan coba lagi saat error dan onRetry ada', async () => {
    const onRetry = vi.fn();
    render(
      <DataState isLoading={false} error="gagal" onRetry={onRetry}>
        <div>isi</div>
      </DataState>,
    );

    const btn = screen.getByRole('button', { name: /coba lagi/i });
    btn.click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('menampilkan keadaan kosong hanya bila TIDAK ada error', () => {
    render(
      <DataState isLoading={false} isEmpty emptyTitle="Belum ada layanan">
        <div>isi asli</div>
      </DataState>,
    );

    expect(screen.getByText('Belum ada layanan')).toBeTruthy();
    expect(screen.queryByText('isi asli')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('menampilkan isi saat sukses dan ada data', () => {
    render(
      <DataState isLoading={false} isEmpty={false}>
        <div>isi asli</div>
      </DataState>,
    );

    expect(screen.getByText('isi asli')).toBeTruthy();
  });
});
