import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sanitizeProps, setAnalyticsSink, track } from './analytics';

/**
 * §12.1 melarang mengirim NIK, HP, rekening, detail alamat, isi chat, dan nama
 * pelanggan ke analytics. Larangan yang hanya ditulis di dokumen akan dilanggar;
 * test inilah yang membuatnya berlaku.
 */
describe('sanitizeProps', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('meneruskan properti yang aman', () => {
    expect(sanitizeProps({ order_id: 'o-1', status: 'PAID', count: 3, is_vendor: true })).toEqual({
      order_id: 'o-1',
      status: 'PAID',
      count: 3,
      is_vendor: true,
    });
  });

  it.each([
    ['ktp_number', '3374010101900001'],
    ['nik', '3374010101900001'],
    ['npwp', '123456789012345'],
    ['customer_phone', '628123456789'],
    ['bank_account_number', '1234567890'],
    ['address_detail', 'Jl. Merdeka 17'],
    ['basecamp_lat', -6.98],
    ['basecamp_lon', 110.4],
    ['chat_message', 'halo pak'],
    ['customer_name', 'Budi Santoso'],
    ['business_email', 'a@b.com'],
  ])('membuang properti terlarang: %s', (key, value) => {
    const out = sanitizeProps({ safe: 'ya', [key]: value } as never);
    expect(out).toEqual({ safe: 'ya' });
    expect(out[key]).toBeUndefined();
  });

  // Data katalog publik BUKAN PII. Kalau ikut terbuang, funnel "profil → klik
  // layanan → booking" kehilangan dimensi yang justru jadi alasan mengukurnya.
  it('tidak membuang nama layanan / mitra — itu data katalog publik', () => {
    const out = sanitizeProps({ service_name: 'Cuci AC', partner_username: 'sejahtera' });
    expect(out.service_name).toBe('Cuci AC');
    expect(out.partner_username).toBe('sejahtera');
  });

  it('membuang undefined agar payload antar-event tetap sebanding', () => {
    expect(sanitizeProps({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it('null dipertahankan — itu nilai yang bermakna, beda dari tidak ada', () => {
    expect(sanitizeProps({ service_id: null })).toEqual({ service_id: null });
  });
});

describe('track', () => {
  afterEach(() => {
    setAnalyticsSink(() => {});
    vi.restoreAllMocks();
  });

  it('meneruskan event & properti yang sudah disaring ke sink', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const sink = vi.fn();
    setAnalyticsSink(sink);

    track('partner_order_action_succeeded', { order_id: 'o-1', customer_name: 'Budi' });

    expect(sink).toHaveBeenCalledWith('partner_order_action_succeeded', { order_id: 'o-1' });
  });

  // Analytics yang gagal tidak boleh menjatuhkan alur yang sedang dijalani
  // pengguna — mitra tidak peduli event-nya terkirim, ia peduli pesanannya masuk.
  it('tidak melempar walau sink error', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    setAnalyticsSink(() => {
      throw new Error('provider mati');
    });

    expect(() => track('partner_dashboard_viewed')).not.toThrow();
  });

  it('aman dipanggil tanpa properti', () => {
    const sink = vi.fn();
    setAnalyticsSink(sink);
    track('partner_dashboard_viewed');
    expect(sink).toHaveBeenCalledWith('partner_dashboard_viewed', {});
  });
});
