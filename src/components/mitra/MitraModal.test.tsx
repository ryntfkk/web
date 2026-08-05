import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import MitraModal from './MitraModal';

/**
 * Perilaku fokus modal (P2 a11y). Ini bukan kosmetik: tanpa focus trap, Tab
 * keluar dari dialog dan menjelajahi halaman di belakangnya yang tidak terlihat
 * . pengguna keyboard menekan tombol yang tidak bisa ia lihat, termasuk aksi
 * destruktif di daftar di baliknya.
 */
function openModal(onClose = vi.fn()) {
  const utils = render(
    <>
      <button type="button">pemicu di luar</button>
      <MitraModal open onClose={onClose} title="Hapus Layanan?" description="Tidak bisa dibatalkan.">
        <button type="button">pertama</button>
        <button type="button">terakhir</button>
      </MitraModal>
    </>,
  );
  return { ...utils, onClose };
}

describe('MitraModal', () => {
  it('tidak merender apa pun saat tertutup', () => {
    render(
      <MitraModal open={false} onClose={vi.fn()} title="Judul">
        <p>isi</p>
      </MitraModal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('mengumumkan dirinya sebagai dialog modal dengan judul & deskripsi terkait', () => {
    openModal();
    const dialog = screen.getByRole('dialog');

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    // aria-labelledby/-describedby harus menunjuk ke id yang BENAR-BENAR ada;
    // menunjuk id yang tak pernah dirender sama saja dengan tanpa label.
    const labelId = dialog.getAttribute('aria-labelledby');
    const descId = dialog.getAttribute('aria-describedby');
    expect(labelId && document.getElementById(labelId)?.textContent).toBe('Hapus Layanan?');
    expect(descId && document.getElementById(descId)?.textContent).toBe('Tidak bisa dibatalkan.');
  });

  // Fokus awal ke PANEL, bukan tombol pertama: kalau tombol pertama adalah aksi
  // destruktif, Enter refleks langsung mengeksekusinya.
  it('memberi fokus awal ke panel, bukan ke tombol pertama', () => {
    openModal();
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('Escape menutup dialog', () => {
    const { onClose } = openModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('klik latar menutup dialog, klik panel TIDAK', () => {
    const onClose = vi.fn();
    render(
      <MitraModal open onClose={onClose} title="Judul">
        <p>isi</p>
      </MitraModal>,
    );

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Tab dari elemen terakhir kembali ke elemen pertama', () => {
    openModal();
    const tutup = screen.getByRole('button', { name: 'Tutup' });
    const terakhir = screen.getByRole('button', { name: 'terakhir' });

    terakhir.focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    // Elemen fokusable pertama di dalam panel adalah tombol Tutup.
    expect(document.activeElement).toBe(tutup);
  });

  // Tanpa cabang shift, Shift+Tab dari elemen pertama tetap lolos keluar dialog
  // . separuh trap sama saja dengan tanpa trap.
  it('Shift+Tab dari elemen pertama membungkus ke elemen terakhir', () => {
    openModal();
    const tutup = screen.getByRole('button', { name: 'Tutup' });
    const terakhir = screen.getByRole('button', { name: 'terakhir' });

    tutup.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(terakhir);
  });

  it('mengunci scroll body selama terbuka dan memulihkannya saat ditutup', () => {
    const { unmount } = openModal();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('mengembalikan fokus ke elemen pemicu setelah ditutup', () => {
    const pemicu = document.createElement('button');
    pemicu.textContent = 'pemicu';
    document.body.appendChild(pemicu);
    pemicu.focus();

    const { unmount } = render(
      <MitraModal open onClose={vi.fn()} title="Judul">
        <p>isi</p>
      </MitraModal>,
    );
    unmount();

    expect(document.activeElement).toBe(pemicu);
    pemicu.remove();
  });
});
