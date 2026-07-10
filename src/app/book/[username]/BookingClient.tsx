"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, MapPin, Calendar, Tag, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoUploader } from '@/components/ui/photo-uploader';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useCartStore } from '@/lib/store/cartStore';
import { unwrapData } from '@/lib/order-utils';
import { getErrorMessage } from '@/types/api';

// Types
interface PartnerService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Address {
  id: string;
  label: string;
  full_address: string;
  is_primary: boolean;
}

export default function BookingClient() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const username = params?.username as string;
  // Mendukung ?service_id=xxx (satu layanan) dan ?service_ids=a,b,c (dari keranjang)
  const preselectedIds = useMemo(
    () =>
      (searchParams.get('service_ids') ?? searchParams.get('service_id') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [searchParams],
  );
  const removeCartItem = useCartStore((s) => s.removeItem);

  const [step, setStep] = useState(1);
  const [partner, setPartner] = useState<any>(null);
  const [services, setServices] = useState<PartnerService[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [addressId, setAddressId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [previewQuote, setPreviewQuote] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Refs
  const preselectedRef = useRef(false);

  // Derived values (dihitung sebelum efek agar bisa jadi dependency)
  const selectedCount = Object.values(selectedServices).filter(Boolean).length;
  const subtotal = useMemo(
    () => services.reduce((sum, s) => sum + (selectedServices[s.id] ? s.price : 0), 0),
    [services, selectedServices],
  );
  const totalPayment = Math.max(0, subtotal - promoDiscount);

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, [selectedServices, date, time, addressId, notes, photos.length, promoCode]);

  // Diskon promo divalidasi terhadap subtotal — jika pilihan layanan
  // berubah, diskon lama tidak lagi valid dan harus divalidasi ulang.
  useEffect(() => {
    setPromoDiscount(0);
  }, [subtotal]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/book/${username}`)}`);
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, username]);

  useEffect(() => {
    if (preselectedIds.length > 0 && services.length > 0 && !preselectedRef.current) {
      const found = services.filter((s) => preselectedIds.includes(s.id));
      if (found.length > 0) {
        preselectedRef.current = true;
        setSelectedServices((prev) => {
          const next = { ...prev };
          for (const s of found) next[s.id] = true;
          return next;
        });
        setStep(2);
      }
    }
  }, [preselectedIds, services]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, aRes] = await Promise.all([
        fetchAPI<any>(`/partners/${username}`),
        fetchAPI<any>(`/partners/${username}/services`),
        fetchAPI<any>('/users/me/addresses')
      ]);

      if (pRes.success && pRes.data) {
        setPartner(unwrapData(pRes.data));
      }

      if (sRes.success && sRes.data) {
        const sData = unwrapData<PartnerService[]>(sRes.data);
        setServices(Array.isArray(sData) ? sData : []);
      } else if (pRes.success && pRes.data) {
        const data = unwrapData<any>(pRes.data);
        if (Array.isArray(data?.services)) setServices(data.services);
      }

      if (aRes.success && aRes.data) {
        const addrList = unwrapData<Address[]>(aRes.data);
        if (Array.isArray(addrList)) {
          setAddresses(addrList);
          const primary = addrList.find((a: Address) => a.is_primary);
          if (primary) setAddressId(primary.id);
          else if (addrList.length > 0) setAddressId(addrList[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch booking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => setStep(2);
  const handlePrev = () => setStep(1);

  const submitOrder = async () => {
    setErrorMsg('');

    // Guard: data partner wajib ada sebelum submit
    if (!partner?.id) {
      setErrorMsg('Data mitra belum termuat. Silakan muat ulang halaman.');
      return;
    }

    const selectedIds = Object.keys(selectedServices).filter(id => selectedServices[id]);
    if (selectedIds.length === 0) {
      setErrorMsg('Pilih minimal satu layanan.');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload photos (via presigned URL)
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const presignedRes = await fetchAPI<any>('/uploads/presigned-url', {
          method: 'POST',
          body: JSON.stringify({
            filename: photo.name,
            content_type: photo.type,
          }),
        });

        const presigned = presignedRes.success ? unwrapData<any>(presignedRes.data) : null;
        if (!presigned?.upload_url) {
          throw new Error('Gagal mendapatkan upload URL');
        }

        const uploadRes = await fetch(presigned.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': photo.type },
          body: photo,
        });
        if (!uploadRes.ok) {
          throw new Error(`Gagal mengunggah foto "${photo.name}"`);
        }
        photoUrls.push(presigned.file_url);
      }

      // 2. Prepare JSON body — pakai idempotencyKey yang stabil selama
      //    form tidak berubah, agar retry tidak membuat pesanan ganda.
      const items = selectedIds.map(id => ({ service_id: id, quantity: 1 }));
      const payload = {
        partner_id: partner.id,
        scheduled_at: `${date}T${time}:00+07:00`,
        address_id: addressId,
        notes: notes || undefined,
        promo_code: promoDiscount > 0 ? promoCode || undefined : undefined,
        items,
        photo_urls: photoUrls,
        idempotency_key: idempotencyKey,
      };

      // 3. Submit Order (fetchAPI = auto token-refresh saat 401)
      const res = await fetchAPI<any>('/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        const order = unwrapData<any>(res.data);
        // Bersihkan layanan yang sudah dipesan dari keranjang
        for (const id of selectedIds) removeCartItem(id);
        setSuccessMsg('Pesanan berhasil dibuat!');
        router.push(`/orders/${order.id}`);
        return;
      }
      setErrorMsg(getErrorMessage(res));
    } catch (e: any) {
      setErrorMsg(e?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async (currentPromo?: string) => {
    if (!partner?.id || !addressId || !date || !time) return;
    
    const items = Object.keys(selectedServices)
      .filter(id => selectedServices[id])
      .map(id => ({ service_id: id, quantity: 1 }));

    if (items.length === 0) return;

    setPreviewLoading(true);
    try {
      const [hours, minutes] = time.split(':');
      const scheduledAt = new Date(date);
      scheduledAt.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      const payload = {
        partner_id: partner.id,
        address_id: addressId,
        scheduled_at: scheduledAt.toISOString(),
        promo_code: currentPromo || undefined,
        items
      };

      const res = await fetchAPI<any>('/orders/preview', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success && res.data) {
        setPreviewQuote(unwrapData(res.data));
        setErrorMsg('');
        if (currentPromo) {
          setPromoDiscount(unwrapData(res.data).discount_amount || 0);
        }
      } else {
        setPreviewQuote(null);
        if (currentPromo) setPromoDiscount(0);
        setErrorMsg(getErrorMessage(res));
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (step === 2) {
      fetchPreview(promoDiscount > 0 ? promoCode : undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, addressId, date, time, selectedServices]);

  const validatePromo = async () => {
    if (!promoCode) return;
    await fetchPreview(promoCode);
  };

  if (!isAuthenticated) return null;
  if (loading && step === 1) return <div className="min-h-screen bg-[#f7f5f4] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" /></div>;

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-28">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] px-4 py-4 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => step === 2 ? handlePrev() : router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <div>
            <h1 className="text-base font-bold text-[#1c1b1b]">{step === 2 ? 'Lengkapi Pesanan' : 'Pilih Layanan'}</h1>
            <p className="text-xs text-[#9e8e8c]">Langkah {step} dari 2</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-lg mx-auto mt-4 bg-[#e5e2e1] h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#b51822] h-full transition-all duration-300" style={{ width: `${(step / 2) * 100}%` }} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#1c1b1b]">Layanan Tersedia</h2>
            <p className="text-sm text-[#5b403e]">Pilih satu atau lebih layanan dari {partner?.name}.</p>
            <div className="space-y-3 mt-4">
              {services.map(s => (
                <label key={s.id} className={`block relative p-4 rounded-xl border cursor-pointer transition-colors ${selectedServices[s.id] ? 'border-[#b51822] bg-[#FFF5F5]' : 'border-[#e5e2e1] bg-white hover:border-[#b51822]/50'}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-[#1c1b1b]">{s.name}</p>
                      <p className="text-xs text-[#9e8e8c] mt-1">{s.duration_minutes} menit</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="font-bold text-[#b51822]">{formatPrice(s.price)}</p>
                      <div className={`mt-2 w-5 h-5 rounded-sm flex items-center justify-center border ${selectedServices[s.id] ? 'bg-[#b51822] border-[#b51822]' : 'border-[#e5e2e1]'}`}>
                        {selectedServices[s.id] && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                  </div>
                  <input type="checkbox" className="hidden" checked={!!selectedServices[s.id]} onChange={e => setSelectedServices(prev => ({ ...prev, [s.id]: e.target.checked }))} />
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            
            {/* Section 1: Jadwal */}
            <div className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden">
              <div className="bg-[#fcfafa] px-4 py-3 border-b border-[#e5e2e1] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#b51822]" />
                <h2 className="font-bold text-[#1c1b1b]">1. Jadwal Pengerjaan</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Pilih Tanggal</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]" min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Pilih Waktu</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['08:00', '10:00', '13:00', '15:00', '17:00'].map(t => (
                      <button key={t} onClick={() => setTime(t)} className={`p-2 rounded border text-sm font-medium transition-colors ${time === t ? 'border-[#b51822] bg-[#FFF5F5] text-[#b51822]' : 'border-[#e5e2e1] text-[#5b403e] hover:border-[#b51822]/50'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Alamat */}
            <div className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden">
              <div className="bg-[#fcfafa] px-4 py-3 border-b border-[#e5e2e1] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#b51822]" />
                <h2 className="font-bold text-[#1c1b1b]">2. Alamat Lokasi</h2>
              </div>
              <div className="p-4 space-y-3">
                {addresses.map(a => (
                  <label key={a.id} className={`block p-4 rounded-xl border cursor-pointer transition-colors ${addressId === a.id ? 'border-[#b51822] bg-[#FFF5F5]' : 'border-[#e5e2e1] bg-white'}`}>
                    <div className="flex gap-3 items-start">
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${addressId === a.id ? 'border-[#b51822]' : 'border-[#9e8e8c]'}`}>
                         {addressId === a.id && <div className="w-2 h-2 bg-[#b51822] rounded-full" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[#1c1b1b] text-sm">{a.label}</span>
                          {a.is_primary && <span className="text-[10px] bg-[#e5e2e1] text-[#5b403e] px-1.5 py-0.5 rounded font-medium">Utama</span>}
                        </div>
                        <p className="text-xs text-[#5b403e] leading-snug">{a.full_address}</p>
                      </div>
                    </div>
                    <input type="radio" name="address" className="hidden" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                  </label>
                ))}
                <Button variant="outline" className="w-full border-dashed border-2 border-[#e5e2e1] text-[#b51822] hover:bg-[#FFF5F5] hover:border-[#b51822]/50 rounded-xl py-6" onClick={() => router.push('/profile/addresses/new')}>
                  + Tambah Alamat Baru
                </Button>
              </div>
            </div>

            {/* Section 3: Catatan & Foto */}
            <div className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden">
              <div className="bg-[#fcfafa] px-4 py-3 border-b border-[#e5e2e1] flex items-center gap-2">
                <h2 className="font-bold text-[#1c1b1b]">3. Catatan & Foto <span className="text-[#9e8e8c] font-normal text-sm">(Opsional)</span></h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Contoh: Titip kunci di satpam, ada anjing peliharaan..." className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] placeholder-[#9e8e8c] focus:outline-none focus:border-[#b51822] resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Upload Foto Kondisi</label>
                  <PhotoUploader maxPhotos={3} value={photos} onChange={setPhotos} />
                </div>
              </div>
            </div>

            {/* Section 4: Promo */}
            <div className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden">
              <div className="bg-[#fcfafa] px-4 py-3 border-b border-[#e5e2e1] flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#b51822]" />
                <h2 className="font-bold text-[#1c1b1b]">4. Promo & Diskon</h2>
              </div>
              <div className="p-4">
                <div className="flex gap-2">
                  <input type="text" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} placeholder="Masukkan kode promo" className="flex-1 p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822] uppercase" />
                  <Button variant="secondary" onClick={validatePromo} disabled={!promoCode} className="bg-[#e5e2e1] text-[#1c1b1b] hover:bg-[#d5d2d1]">Gunakan</Button>
                </div>
                {promoDiscount > 0 && (
                  <div className="mt-3 p-3 bg-[#EBF8FF] border border-[#BEE3F8] rounded text-sm text-[#3182CE] flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> Promo digunakan</span>
                    <span className="font-semibold">- {formatPrice(promoDiscount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Ringkasan Pesanan */}
            <div className="bg-white rounded-xl border border-[#e5e2e1] p-4 space-y-4 shadow-sm mb-4">
              <h3 className="font-bold text-[#1c1b1b] border-b border-[#e5e2e1] pb-2">Rincian Pembayaran</h3>
              
              <div className="space-y-2 mt-3">
                {services.filter(s => selectedServices[s.id]).map(s => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="text-[#5b403e]">{s.name}</span>
                    <span className="font-medium text-[#1c1b1b]">{formatPrice(s.price)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm pt-3 border-t border-[#e5e2e1]">
                <div className="flex justify-between text-[#5b403e]">
                  <span>Subtotal Jasa</span>
                  <span>{formatPrice(previewQuote ? previewQuote.total_service_price : subtotal)}</span>
                </div>
                {previewQuote && (
                  <>
                    <div className="flex justify-between text-[#5b403e]">
                      <span>Biaya Transportasi</span>
                      <span>{formatPrice(previewQuote.transport_fee)}</span>
                    </div>
                    <div className="flex justify-between text-[#5b403e]">
                      <span>Biaya Layanan (Platform)</span>
                      <span>{formatPrice(previewQuote.admin_fee)}</span>
                    </div>
                  </>
                )}
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-[#38A169]">
                    <span>Diskon Promo</span>
                    <span>- {formatPrice(promoDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-[#1c1b1b] pt-2 border-t border-[#e5e2e1] mt-2">
                  <span>Total Bayar</span>
                  <span className="text-[#b51822]">
                    {previewLoading ? 'Menghitung...' : formatPrice(previewQuote ? previewQuote.agreed_price : totalPayment)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] px-4 py-3 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {errorMsg && (
          <div className="max-w-lg mx-auto mb-2 p-2.5 bg-[#FFF5F5] border border-[#FEB2B2] rounded text-xs text-[#E53E3E] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="max-w-lg mx-auto mb-2 p-2.5 bg-[#F0FFF4] border border-[#9AE6B4] rounded text-xs text-[#38A169]">
            {successMsg}
          </div>
        )}
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          {step === 1 ? (
            <>
              <div className="flex-1">
                <p className="text-xs text-[#9e8e8c]">Subtotal</p>
                <p className="text-lg font-bold text-[#b51822]">{formatPrice(subtotal)}</p>
              </div>
              <Button
                className="bg-[#b51822] hover:bg-[#90121a] rounded px-8"
                onClick={handleNext}
                disabled={selectedCount === 0}
              >
                Lanjut
              </Button>
            </>
          ) : (
            <>
              <div className="flex-1">
                <p className="text-xs text-[#9e8e8c]">Total Bayar</p>
                <p className="text-lg font-bold text-[#b51822]">
                  {previewLoading ? '...' : formatPrice(previewQuote ? previewQuote.agreed_price : totalPayment)}
                </p>
              </div>
              <Button
                className="bg-[#b51822] hover:bg-[#90121a] rounded px-8"
                onClick={submitOrder}
                disabled={loading || !date || !time || !addressId}
              >
                {loading ? 'Memproses...' : 'Buat Pesanan'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

