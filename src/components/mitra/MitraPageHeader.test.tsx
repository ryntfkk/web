import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MitraPageHeader from './MitraPageHeader';

const mocks = vi.hoisted(() => ({
  pathname: '/mitra/services',
  verification: 'PENDING' as string | undefined,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  // MobilePageHeader di dalamnya memanggil useRouter untuk tombol kembali.
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/hooks/usePartnerVerificationStatus', () => ({
  usePartnerVerificationStatus: () => ({ data: mocks.verification }),
}));

function renderAt(pathname: string, verification: string | undefined) {
  mocks.pathname = pathname;
  mocks.verification = verification;
  return render(<MitraPageHeader title="Layanan Saya" />);
}

describe('MitraPageHeader . spanduk menunggu verifikasi', () => {
  /**
   * Inti keluhannya: spanduk dulu dirender shell (`MitraLayoutClient`) SEBELUM
   * `{children}`, sementara header halaman ada di dalam children . jadi
   * spanduknya duduk di atas header dan tampak bukan milik halaman mana pun.
   */
  it('berada SETELAH bilah header di urutan DOM, bukan di atasnya', () => {
    const { container } = renderAt('/mitra/services', 'PENDING');

    const sticky = container.querySelector('.sticky');
    const notice = screen.getByText('Menunggu verifikasi');
    expect(sticky).not.toBeNull();
    // Node.DOCUMENT_POSITION_FOLLOWING = spanduk muncul sesudah header.
    expect(sticky!.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('muncul di semua halaman `prepare`, tanpa halaman harus mengingatnya', () => {
    for (const path of ['/mitra/services', '/mitra/services/new', '/mitra/portfolio', '/mitra/schedule']) {
      const { unmount } = renderAt(path, 'PENDING');
      // getByText sendiri sudah melempar bila tidak ada.
      expect(screen.getByText('Menunggu verifikasi')).toBeTruthy();
      unmount();
    }
  });

  it('DIAM di halaman `always` dan `live` . di sana bukan itu pesannya', () => {
    for (const path of ['/mitra/profile', '/mitra/documents', '/mitra/dashboard', '/mitra/wallet']) {
      const { unmount } = renderAt(path, 'PENDING');
      expect(screen.queryByText('Menunggu verifikasi')).toBeNull();
      unmount();
    }
  });

  it('DIAM untuk mitra yang sudah disetujui / status belum diketahui', () => {
    for (const status of ['APPROVED', 'NONE', undefined]) {
      const { unmount } = renderAt('/mitra/services', status);
      expect(screen.queryByText('Menunggu verifikasi')).toBeNull();
      expect(screen.queryByText('Verifikasi ditolak')).toBeNull();
      unmount();
    }
  });

  it('mitra yang ditolak diberi jalan keluar, bukan kalimat menunggu', () => {
    renderAt('/mitra/services', 'REJECTED');
    expect(screen.getByText('Verifikasi ditolak')).toBeTruthy();
    expect(screen.getByText('Lihat alasan & ajukan ulang').getAttribute('href')).toBe(
      '/mitra/verification-status',
    );
  });
});
