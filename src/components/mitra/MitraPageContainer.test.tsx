import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MitraPageContainer, { MITRA_GUTTER, containerWidthClass } from './MitraPageContainer';

describe('MitraPageContainer', () => {
  it('memakai gutter berjenjang, bukan `px-4` datar', () => {
    // Inti keluhan "berdempetan": sidebar 240px membuat ruang konten di laptop
    // 1366px tinggal 1126px . lebih sempit dari `max-w-6xl`, jadi capnya tak
    // pernah aktif dan `px-4` jadi satu-satunya jarak ke tepi.
    expect(MITRA_GUTTER).toContain('sm:px-6');
    expect(MITRA_GUTTER).toContain('lg:px-8');

    const { container } = render(<MitraPageContainer>isi</MitraPageContainer>);
    const el = container.firstElementChild!;
    for (const cls of MITRA_GUTTER.split(' ')) {
      expect(el.className).toContain(cls);
    }
  });

  it('memusatkan diri pada lebar variannya', () => {
    for (const variant of ['form', 'list', 'dashboard', 'detail', 'profile'] as const) {
      const { container } = render(<MitraPageContainer variant={variant}>isi</MitraPageContainer>);
      const el = container.firstElementChild!;
      expect(el.className).toContain(containerWidthClass(variant));
      expect(el.className).toContain('mx-auto');
    }
  });

  it('`className` pemanggil MENIMPA ritme vertikal bawaan, bukan bertabrakan', () => {
    // Tanpa tailwind-merge kedua kelas terpasang dan urutan CSS-lah yang
    // menentukan pemenangnya . bukan pemanggil. Halaman seperti /mitra/register
    // yang butuh `pb-32` untuk bilah aksi akan diam-diam kalah.
    const { container } = render(<MitraPageContainer className="py-0">isi</MitraPageContainer>);
    const cls = container.firstElementChild!.className;
    expect(cls).toContain('py-0');
    expect(cls).not.toContain('py-6');
  });

  it('varian header dan varian badan memakai lebar yang sama persis', () => {
    // Ketidakcocokan inilah yang membuat judul menggantung jauh dari kartunya
    // di lima halaman (mis. header `list` 1152px di atas badan 672px).
    expect(containerWidthClass('form')).toBe('max-w-2xl');
    expect(containerWidthClass('list')).toBe(containerWidthClass('detail'));
  });
});
