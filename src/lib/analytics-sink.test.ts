import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Sink analytics. Yang diuji BUKAN "apakah datanya sampai" . itu urusan
 * collector . melainkan dua janji yang kalau dilanggar merugikan pengguna:
 *
 * 1. Tanpa `NEXT_PUBLIC_ANALYTICS_ENDPOINT`, TIDAK ADA apa pun yang terkirim.
 *    Build yang belum dikonfigurasi tidak boleh diam-diam mengirim data.
 * 2. Kegagalan pengiriman tidak pernah melempar.
 */
describe('installAnalyticsSink', () => {
  const realBeacon = navigator.sendBeacon;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'sendBeacon', {
      value: realBeacon,
      configurable: true,
      writable: true,
    });
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  });

  function mockBeacon(result = true) {
    const spy = vi.fn().mockReturnValue(result);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: spy,
      configurable: true,
      writable: true,
    });
    return spy;
  }

  it('TIDAK mengirim apa pun bila endpoint belum dikonfigurasi', async () => {
    const spy = mockBeacon();
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as never;

    const { installAnalyticsSink } = await import('./analytics-sink');
    const { track } = await import('./analytics');
    installAnalyticsSink();
    track('partner_dashboard_viewed');

    expect(spy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('mengirim lewat sendBeacon saat endpoint dikonfigurasi', async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT = 'https://collector.example/e';
    const spy = mockBeacon(true);

    const { installAnalyticsSink } = await import('./analytics-sink');
    const { track } = await import('./analytics');
    installAnalyticsSink();
    track('partner_schedule_saved', { open_days: 5 });

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toBe('https://collector.example/e');
  });

  // Beacon ditolak browser (mis. payload terlalu besar) tidak boleh berarti
  // event-nya hilang begitu saja . ada jalur cadangan.
  it('jatuh ke fetch keepalive bila sendBeacon menolak', async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT = 'https://collector.example/e';
    mockBeacon(false);
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchSpy as never;

    const { installAnalyticsSink } = await import('./analytics-sink');
    const { track } = await import('./analytics');
    installAnalyticsSink();
    track('partner_dashboard_viewed');

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][1].keepalive).toBe(true);
  });

  it('tidak melempar walau kedua jalur pengiriman gagal', async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT = 'https://collector.example/e';
    Object.defineProperty(navigator, 'sendBeacon', {
      value: () => {
        throw new Error('beacon mati');
      },
      configurable: true,
      writable: true,
    });
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('jaringan mati')) as never;

    const { installAnalyticsSink } = await import('./analytics-sink');
    const { track } = await import('./analytics');
    installAnalyticsSink();

    expect(() => track('partner_dashboard_viewed')).not.toThrow();
  });

  // Penyaring PII ada di `track`, bukan di sink. Test ini memastikan urutannya
  // tidak terbalik: apa pun yang sampai ke sink SUDAH bersih.
  it('payload yang sampai ke sink sudah bebas PII', async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT = 'https://collector.example/e';
    const spy = mockBeacon(true);
    vi.spyOn(console, 'error').mockImplementation(() => { });

    const { installAnalyticsSink } = await import('./analytics-sink');
    const { track } = await import('./analytics');
    installAnalyticsSink();
    track('public_partner_booking_completed', {
      order_id: 'o-1',
      customer_name: 'Budi Santoso',
      customer_phone: '628123',
    });

    const blob = spy.mock.calls[0][1] as Blob;
    const body = await blob.text();
    expect(body).toContain('o-1');
    expect(body).not.toContain('Budi Santoso');
    expect(body).not.toContain('628123');
  });
});
