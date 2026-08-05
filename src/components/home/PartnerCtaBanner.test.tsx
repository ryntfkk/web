import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import PartnerCtaBanner from './PartnerCtaBanner';

/**
 * Banner ini satu-satunya jalan masuk ke /jadi-mitra dari beranda.
 *
 * Tautannya juga yang membawa otoritas dari halaman paling sering dibuka ke
 * halaman akuisisi mitra. Kalau href-nya salah ketik atau berubah jadi
 * /mitra/... (area ber-noindex yang memagari pengunjung anonim), banner tetap
 * TAMPAK baik-baik saja . yang hilang adalah tujuannya.
 */
describe('PartnerCtaBanner', () => {
  it('menaut ke /jadi-mitra, bukan ke area /mitra yang tertutup', () => {
    render(<PartnerCtaBanner />);

    const tautan = screen.getByRole('link');
    expect(tautan.getAttribute('href')).toBe('/jadi-mitra');
  });

  it('menyebut gratis dan alasan pindah di dalam HTML-nya', () => {
    const { container } = render(<PartnerCtaBanner />);
    const teks = container.textContent ?? '';

    // Tanpa peduli huruf besar/kecil: yang diuji adalah JANJI-nya masih
    // disebut, bukan di kalimat mana ia ditulis. Copy banner sudah pernah
    // dirombak dari prosa ("...gratis...") jadi bullet ("Gratis, tanpa
    // langganan") dan mematahkan test ini padahal maksudnya tetap terpenuhi.
    expect(teks.toLowerCase()).toContain('gratis');
    expect(teks).toContain('Google');
  });
});
