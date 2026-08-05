import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const usePathname = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ usePathname }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [] }) }));
vi.mock('@/lib/api', () => ({ fetchAPI: vi.fn() }));
vi.mock('@/hooks/usePlatformConfig', () => ({ usePlatformConfig: () => ({ profile: null }) }));

import Footer from './Footer';

/**
 * Footer adalah bagian kerangka PELANGGAN. `HeaderWrapper` sudah menepi untuk
 * `/mitra`; footer sempat tidak ikut, sehingga setiap halaman mode mitra di
 * `md+` diakhiri kolom SEO "Kategori Populer / Kota Populer" . dan
 * `max-w-[1200px]`-nya terpusat pada VIEWPORT sementara konten mitra bergeser
 * 240px oleh sidebar, jadi terlihat miring pula.
 */
describe('Footer', () => {
  beforeEach(() => usePathname.mockReset());

  it.each(['/mitra/dashboard', '/mitra/wallet', '/mitra/orders/abc'])(
    'tidak dirender di %s',
    (path) => {
      usePathname.mockReturnValue(path);
      const { container } = render(<Footer />);
      expect(container.innerHTML).toBe('');
    },
  );

  it('tidak dirender di /chat', () => {
    usePathname.mockReturnValue('/chat');
    const { container } = render(<Footer />);
    expect(container.innerHTML).toBe('');
  });

  it('tetap dirender di halaman pelanggan', () => {
    usePathname.mockReturnValue('/');
    const { container } = render(<Footer />);
    expect(container.querySelector('footer')).toBeTruthy();
  });
});
