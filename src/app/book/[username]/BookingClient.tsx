"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, MapPin, Calendar, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoUploader } from '@/components/ui/photo-uploader';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

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
  const preselectedServiceId = searchParams.get('service_id') || undefined;

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
  
  // Refs
  const preselectedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, username]);

  useEffect(() => {
    if (preselectedServiceId && services.length > 0 && !preselectedRef.current) {
      const found = services.find((s) => s.id === preselectedServiceId);
      if (found) {
        preselectedRef.current = true;
        setSelectedServices((prev) => ({ ...prev, [found.id]: true }));
        setStep(2);
      }
    }
  }, [preselectedServiceId, services]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, aRes] = await Promise.all([
        fetchAPI<any>(`/partners/${username}`),
        fetchAPI<any>(`/partners/${username}/services`),
        fetchAPI<any>('/users/me/addresses')
      ]);

      if (pRes.success && pRes.data) {
        const data = pRes.data.data ?? pRes.data;
        setPartner(data);
      }

      if (sRes.success && sRes.data) {
        const sData = sRes.data.data ?? sRes.data;
        setServices(sData || []);
      } else if (pRes.success && pRes.data) {
        const data = pRes.data.data ?? pRes.data;
        if (data.services) setServices(data.services);
      }

      if (aRes.success && aRes.data) {
        const addrList = aRes.data.data ?? aRes.data;
        setAddresses(addrList);
        const primary = addrList.find((a: Address) => a.is_primary);
        if (primary) setAddressId(primary.id);
        else if (addrList.length > 0) setAddressId(addrList[0].id);
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
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('partner_id', partner.id);
      formData.append('scheduled_at', `${date}T${time}:00+07:00`);
      formData.append('address_id', addressId);
      if (notes) formData.append('notes', notes);
      if (promoCode) formData.append('promo_code', promoCode);
      
      const selectedIds = Object.keys(selectedServices).filter(id => selectedServices[id]);
      selectedIds.forEach(id => formData.append('service_ids', id));
      photos.forEach(p => formData.append('photos', p));

      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.poskojasa.com/api/v1'}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Platform': 'web',
          'X-App-Version': '1.0.0',
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const order = data.data.data ?? data.data;
        router.push(`/orders/${order.id}`);
      } else {
        alert(data.message || 'Gagal membuat pesanan');
      }
    } catch (e: any) {
      alert('Terjadi kesalahan jaringan.');
    }
    setLoading(false);
  };

  const validatePromo = async () => {
    if (!promoCode) return;
    const res = await fetchAPI<any>('/promos/validate', {
      method: 'POST',
      body: JSON.stringify({ code: promoCode, total_amount: subtotal })
    });
    if (res.success && res.data) {
      setPromoDiscount(res.data.discount_amount);
      alert('Promo berhasil digunakan!');
    } else {
      setPromoDiscount(0);
      alert(res.message || 'Promo tidak valid');
    }
  };

  if (!isAuthenticated) return null;
  if (loading && step === 1) return <div className="min-h-screen bg-[#f7f5f4] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" /></div>;

  const selectedCount = Object.values(selectedServices).filter(Boolean).length;
  const subtotal = services.reduce((sum, s) => sum + (selectedServices[s.id] ? s.price : 0), 0);
  const totalPayment = Math.max(0, subtotal - promoDiscount);

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
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-[#38A169]">
                    <span>Diskon Promo</span>
                    <span>- {formatPrice(promoDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-[#1c1b1b] pt-2">
                  <span>Total Bayar</span>
                  <span className="text-[#b51822]">{formatPrice(totalPayment)}</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] px-4 py-3 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
                <p className="text-lg font-bold text-[#b51822]">{formatPrice(totalPayment)}</p>
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

