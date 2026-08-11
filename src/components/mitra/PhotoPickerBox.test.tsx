import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PhotoPickerBox from './PhotoPickerBox';

const items = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ key: `k${i}`, src: `https://cdn.example.com/${i}.jpg` }));

function setup(props: Partial<React.ComponentProps<typeof PhotoPickerBox>> = {}) {
  const onPick = vi.fn();
  const onRemove = vi.fn();
  const utils = render(
    <PhotoPickerBox id="bukti" items={[]} max={5} onPick={onPick} onRemove={onRemove} {...props} />,
  );
  return { ...utils, onPick, onRemove };
}

describe('PhotoPickerBox', () => {
  /**
   * Inti keluhannya: `<input type="file">` telanjang tidak terbaca sebagai
   * fitur unggah di tengah form yang seluruh field lainnya berkotak. Ajakan
   * yang terlihat . bukan kontrol bawaan browser . adalah seluruh gunanya
   * komponen ini.
   */
  it('menyembunyikan input mentah dan menggantinya dengan ajakan yang terlihat', () => {
    const { container } = setup();

    const input = container.querySelector('input[type="file"]')!;
    expect(input.className).toContain('hidden');
    // Ajakan HARUS sebuah <label for>, kalau tidak kotaknya cuma gambar mati.
    const trigger = container.querySelector('label[for="bukti"]');
    expect(trigger).not.toBeNull();
    expect(trigger!.textContent).toContain('Ketuk untuk memilih foto');
    expect(trigger!.textContent).toContain('Belum ada foto');
  });

  it('menghitung foto terhadap batasnya, bukan diam saja', () => {
    setup({ items: items(2) });
    expect(screen.getByText('2 dari 5 foto')).toBeTruthy();
  });

  it('setiap foto bisa dihapus satu per satu', () => {
    const { onRemove } = setup({ items: items(3) });
    fireEvent.click(screen.getByLabelText('Hapus foto 2'));
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('mengunci diri saat penuh . dan mengatakan kenapa', () => {
    const { container } = setup({ items: items(5) });
    expect(container.querySelector('input[type="file"]')).toHaveProperty('disabled', true);
    expect(screen.getByText(/hapus salah satu untuk mengganti/)).toBeTruthy();
    // Tanpa ini pemakai menekan kotak yang mati tanpa tahu sebabnya.
    expect(screen.queryByText('Tambah')).toBeNull();
  });

  it('mengunci diri selama mengunggah, bukan menerima antrean kedua', () => {
    const { container } = setup({ items: items(1), busy: true });
    expect(container.querySelector('input[type="file"]')).toHaveProperty('disabled', true);
    expect(screen.getByText('Mengunggah…')).toBeTruthy();
  });

  it('menampilkan alasan berkas ditolak . dulu dibuang diam-diam', () => {
    setup({ error: '2 foto melebihi 5MB — tidak ditambahkan.' });
    expect(screen.getByText('2 foto melebihi 5MB — tidak ditambahkan.')).toBeTruthy();
  });

  it('mengosongkan nilai input supaya berkas yang sama bisa dipilih ulang', () => {
    // Setelah foto dihapus dari petak, memilih berkas yang sama persis tidak
    // memicu `change` bila nilainya masih tersimpan di input.
    const { container, onPick } = setup();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(onPick).toHaveBeenCalled();
    expect(input.value).toBe('');
  });
});
