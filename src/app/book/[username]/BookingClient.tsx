"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, MapPin, Calendar, Tag, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoUploader } from '@/components/ui/photo-uploader';
import { ServiceItemCard } from '@/components/ui/service-item-card';
import { PLACEHOLDER_AVATAR } from '@/lib/images';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useCartStore } from '@/lib/store/cartStore';
import { unwrapData } from '@/lib/order-utils';
import { getErrorMessage } from '@/types/api';

// Types
interface ServicePhoto {
  id: string;
  photo_url: string;
  is_primary?: boolean;
}

interface PartnerService {
  id: string;
  name: string;
  price: number;
  duration_minutes?: number;
  estimated_duration?: number;
  photos?: ServicePhoto[];
  photo_url?: string;
}

function servicePhoto(s: PartnerService): string | undefined {
  return (
    s.photos?.find((p) => p.is_primary)?.photo_url ||
    s.photos?.[0]?.photo_url ||
    s.photo_url ||
    undefined
  );
}

function serviceDuration(s: PartnerService): number | undefined {
  return s.duration_minutes ?? s.estimated_duration;
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
  const [showAddressList, setShowAddressList] = useState(false);
  
  // Slots State
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  
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

  const totalDuration = useMemo(
    () => services.reduce((sum, s) => sum + (selectedServices[s.id] ? (serviceDuration(s) || 0) : 0), 0),
    [services, selectedServices],
  );

  useEffect(() => {
    if (date && partner?.id) {
      const fetchSlots = async () => {
        setSlotsLoading(true);
        try {
          const res = await fetchAPI<any>(`/orders/${partner.id}/schedule?date=${date}&duration=${totalDuration || 60}`);
          const data = res.success ? unwrapData<any>(res.data) : null;
          if (data && Array.isArray(data.slots)) {
            setAvailableSlots(data.slots);
          } else {
            setAvailableSlots([]);
          }
        } catch (err) {
          console.error('Failed to fetch schedule', err);
          setAvailableSlots([]);
        } finally {
          setSlotsLoading(false);
        }
      };
      fetchSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [date, partner?.id, totalDuration]);

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
        promo_code: promoCode || undefined,
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
  if (loading && step === 1) return <div className="page-h bg-[#f7f5f4] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" /></div>;

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  const selectedAddress = addresses.find((a) => a.id === addressId);
  const selectedServiceList = services.filter((s) => selectedServices[s.id]);

  // Section Promo — dipakai di kolom kiri (mobile) & kolom kanan (desktop)
  const promoSection = (
    <div className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#e5e2e1] flex items-center gap-2">
        <Tag className="w-4 h-4 text-[#b51822]" />
        <h2 className="text-sm font-bold text-[#1c1b1b]">Promo & Diskon</h2>
      </div>
      <div className="p-3 sm:p-4">
        <div className="flex gap-2">
          <input type="text" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} placeholder="Masukkan kode promo" className="flex-1 min-w-0 p-2.5 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822] uppercase" />
          <Button variant="secondary" onClick={validatePromo} disabled={!promoCode} className="bg-[#e5e2e1] text-[#1c1b1b] hover:bg-[#d5d2d1] shrink-0">Gunakan</Button>
        </div>
        {promoDiscount > 0 && (
          <div className="mt-3 p-2.5 bg-[#EBF8FF] border border-[#BEE3F8] rounded text-sm text-[#3182CE] flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> Promo digunakan</span>
            <span className="font-semibold">- {formatPrice(promoDiscount)}</span>
          </div>
        )}
      </div>
    </div>
  );

  // Section Rincian Pembayaran — withAction=true menampilkan tombol submit (desktop)
  const summarySection = (withAction: boolean) => (
    <div className="bg-white rounded-xl border border-[#e5e2e1] p-4 space-y-3 shadow-sm">
      <h3 className="text-sm font-bold text-[#1c1b1b] border-b border-[#e5e2e1] pb-2">Rincian Pembayaran</h3>

      <div className="space-y-1.5">
        {selectedServiceList.map(s => (
          <div key={s.id} className="flex justify-between gap-3 text-sm">
            <span className="text-[#5b403e] truncate">{s.name}</span>
            <span className="font-medium text-[#1c1b1b] shrink-0">{formatPrice(s.price)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 text-sm pt-2.5 border-t border-[#e5e2e1]">
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
        <div className="flex justify-between font-bold text-base text-[#1c1b1b] pt-2 border-t border-[#e5e2e1]">
          <span>Total Bayar</span>
          <span className="text-[#b51822]">
            {previewLoading ? 'Menghitung...' : formatPrice(previewQuote ? previewQuote.agreed_price : totalPayment)}
          </span>
        </div>
      </div>

      {withAction && (
        <div className="pt-1 space-y-2">
          {errorMsg && (
            <div className="p-2.5 bg-[#FFF5F5] border border-[#FEB2B2] rounded text-xs text-[#E53E3E] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-2.5 bg-[#F0FFF4] border border-[#9AE6B4] rounded text-xs text-[#38A169]">{successMsg}</div>
          )}
          <Button
            className="w-full bg-[#b51822] hover:bg-[#90121a] rounded py-5"
            onClick={submitOrder}
            disabled={loading || !date || !time || !addressId}
          >
            {loading ? 'Memproses...' : 'Buat Pesanan'}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className={`page-h bg-[#f7f5f4] ${step === 2 ? 'pb-28 lg:pb-10' : 'pb-28'}`}>
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] px-4 py-4 sticky top-16 z-30">
        <div className={`${step === 2 ? 'max-w-lg lg:max-w-5xl' : 'max-w-lg'} mx-auto flex items-center gap-3`}>
          <button onClick={() => step === 2 ? handlePrev() : router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <div>
            <h1 className="text-base font-bold text-[#1c1b1b]">{step === 2 ? 'Lengkapi Pesanan' : 'Pilih Layanan'}</h1>
            <p className="text-xs text-[#9e8e8c]">Langkah {step} dari 2</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className={`${step === 2 ? 'max-w-lg lg:max-w-5xl' : 'max-w-lg'} mx-auto mt-4 bg-[#e5e2e1] h-1.5 rounded-full overflow-hidden`}>
          <div className="bg-[#b51822] h-full transition-all duration-300" style={{ width: `${(step / 2) * 100}%` }} />
        </div>
      </div>

      <div className={`${step === 2 ? 'max-w-lg lg:max-w-5xl' : 'max-w-lg'} mx-auto px-4 py-6`}>
        {step === 1 && (
          <div className="space-y-4">
            {/* Header mitra */}
            <div className="bg-white rounded-xl border border-[#e5e2e1] p-4 flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full overflow-hidden bg-[#f0eded] shrink-0">
                <Image
                  src={partner?.avatar_url || PLACEHOLDER_AVATAR}
                  alt={partner?.name || 'Mitra'}
                  fill
                  className="object-cover"
                  sizes="44px"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1c1b1b] truncate">{partner?.name}</p>
                <p className="text-xs text-[#9e8e8c]">Pilih satu atau lebih layanan di bawah ini</p>
              </div>
            </div>

            {/* Kartu layanan horizontal (selectable) */}
            <div className="space-y-3">
              {services.map(s => (
                <ServiceItemCard
                  key={s.id}
                  name={s.name}
                  price={s.price}
                  photoUrl={servicePhoto(s)}
                  durationMinutes={serviceDuration(s)}
                  selected={!!selectedServices[s.id]}
                  onSelect={() => setSelectedServices(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:items-start">
            {/* Kolom kiri: form pesanan */}
            <div className="space-y-3 lg:space-y-4">

              {/* Alamat (compact: hanya alamat terpilih + tombol Ganti) */}
              <div className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#e5e2e1] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#b51822]" />
                    <h2 className="text-sm font-bold text-[#1c1b1b]">Alamat Pengerjaan</h2>
                  </div>
                  {addresses.length > 0 && (
                    <button onClick={() => setShowAddressList(v => !v)} className="text-xs font-semibold text-[#b51822] hover:underline">
                      {showAddressList ? 'Tutup' : 'Ganti'}
                    </button>
                  )}
                </div>
                <div className="p-3 sm:p-4">
                  {!showAddressList ? (
                    selectedAddress ? (
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-[#1c1b1b] text-sm">{selectedAddress.label}</span>
                          {selectedAddress.is_primary && <span className="text-[10px] bg-[#e5e2e1] text-[#5b403e] px-1.5 py-0.5 rounded font-medium">Utama</span>}
                        </div>
                        <p className="text-xs text-[#5b403e] leading-snug">{selectedAddress.full_address}</p>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full border-dashed border-2 border-[#e5e2e1] text-[#b51822] hover:bg-[#FFF5F5] hover:border-[#b51822]/50 rounded-xl" onClick={() => router.push('/profile/addresses/new')}>
                        + Tambah Alamat Baru
                      </Button>
                    )
                  ) : (
                    <div className="space-y-2">
                      {addresses.map(a => (
                        <label key={a.id} className={`block p-3 rounded-lg border cursor-pointer transition-colors ${addressId === a.id ? 'border-[#b51822] bg-[#FFF5F5]' : 'border-[#e5e2e1] bg-white hover:border-[#b51822]/40'}`}>
                          <div className="flex gap-2.5 items-start">
                            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${addressId === a.id ? 'border-[#b51822]' : 'border-[#9e8e8c]'}`}>
                              {addressId === a.id && <div className="w-2 h-2 bg-[#b51822] rounded-full" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-semibold text-[#1c1b1b] text-sm">{a.label}</span>
                                {a.is_primary && <span className="text-[10px] bg-[#e5e2e1] text-[#5b403e] px-1.5 py-0.5 rounded font-medium">Utama</span>}
                              </div>
                              <p className="text-xs text-[#5b403e] leading-snug">{a.full_address}</p>
                            </div>
                          </div>
                          <input type="radio" name="address" className="hidden" checked={addressId === a.id} onChange={() => { setAddressId(a.id); setShowAddressList(false); }} />
                        </label>
                      ))}
                      <button onClick={() => router.push('/profile/addresses/new')} className="w-full p-2.5 border-2 border-dashed border-[#e5e2e1] rounded-lg text-sm font-medium text-[#b51822] hover:bg-[#FFF5F5] hover:border-[#b51822]/50 transition-colors">
                        + Tambah Alamat Baru
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Jadwal (tanggal & waktu berdampingan di layar >= sm) */}
              <div className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#e5e2e1] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#b51822]" />
                  <h2 className="text-sm font-bold text-[#1c1b1b]">Jadwal Pengerjaan</h2>
                </div>
                <div className="p-3 sm:p-4 grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
                  <div>
                    <label className="block text-xs font-semibold text-[#5b403e] mb-1.5">Tanggal</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]" min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5b403e] mb-1.5">Waktu</label>
                    {slotsLoading ? (
                      <div className="text-sm text-[#5b403e] py-2">Memuat jadwal...</div>
                    ) : !date ? (
                      <div className="text-sm text-[#9e8e8c] py-2">Pilih tanggal terlebih dahulu</div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-sm text-red-600 py-2">Tidak ada jadwal tersedia pada tanggal ini</div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        {availableSlots.map(t => (
                          <button key={t} onClick={() => setTime(t)} className={`py-1.5 rounded border text-sm font-medium transition-colors ${time === t ? 'border-[#b51822] bg-[#FFF5F5] text-[#b51822]' : 'border-[#e5e2e1] text-[#5b403e] hover:border-[#b51822]/50'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Layanan dipesan (thumbnail ala marketplace) */}
              <div className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#e5e2e1] flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#1c1b1b]">Layanan Dipesan <span className="text-[#9e8e8c] font-normal">({selectedCount})</span></h2>
                  <button onClick={handlePrev} className="text-xs font-semibold text-[#b51822] hover:underline">Ubah</button>
                </div>
                <div className="divide-y divide-[#f0eded]">
                  {selectedServiceList.map(s => (
                    <div key={s.id} className="flex items-center gap-3 px-3 sm:px-4 py-2.5">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#f0eded] shrink-0">
                        {servicePhoto(s) ? (
                          <Image src={servicePhoto(s)!} alt={s.name} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Tag className="w-4 h-4 text-[#9e8e8c]" /></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1c1b1b] truncate">{s.name}</p>
                        {serviceDuration(s) ? <p className="text-xs text-[#9e8e8c]">± {serviceDuration(s)} menit</p> : null}
                      </div>
                      <p className="text-sm font-bold text-[#1c1b1b] shrink-0">{formatPrice(s.price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catatan & Foto */}
              <div className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#e5e2e1]">
                  <h2 className="text-sm font-bold text-[#1c1b1b]">Catatan & Foto <span className="text-[#9e8e8c] font-normal text-xs">(Opsional)</span></h2>
                </div>
                <div className="p-3 sm:p-4 space-y-3">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Contoh: Titip kunci di satpam, ada anjing peliharaan..." className="w-full p-2.5 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] placeholder-[#9e8e8c] focus:outline-none focus:border-[#b51822] resize-none" />
                  <div>
                    <label className="block text-xs font-semibold text-[#5b403e] mb-1.5">Upload Foto Kondisi</label>
                    <PhotoUploader maxPhotos={3} value={photos} onChange={setPhotos} />
                  </div>
                </div>
              </div>

              {/* Mobile & tablet: promo + rincian di alur konten */}
              <div className="space-y-3 lg:hidden">
                {promoSection}
                {summarySection(false)}
              </div>
            </div>

            {/* Kolom kanan (desktop): promo + ringkasan sticky + tombol submit */}
            <aside className="hidden lg:block lg:sticky lg:top-44 space-y-4">
              {promoSection}
              {summarySection(true)}
            </aside>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] px-4 py-3 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] ${step === 2 ? 'lg:hidden' : ''}`}>
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

