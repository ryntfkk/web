"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, MapPin, Calendar, Tag, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoUploader } from '@/components/ui/photo-uploader';
import { ServiceItemCard } from '@/components/ui/service-item-card';
import { PLACEHOLDER_AVATAR } from '@/lib/images';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useCartStore } from '@/lib/store/cartStore';
import { unwrapData, unitLabel } from '@/lib/order-utils';
import { getErrorMessage } from '@/types/api';
import dynamic from 'next/dynamic';

// Peta hanya di klien (butuh window/Google Maps) → hindari SSR.
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// Types
interface ServicePhoto {
  id: string;
  photo_url: string;
  is_primary?: boolean;
}

interface ServiceVariation {
  id: string;
  name: string;
  price: number;
}

interface PartnerService {
  id: string;
  name: string;
  price: number;
  duration_minutes?: number;
  estimated_duration?: number;
  unit?: string;
  min_order?: number;
  variations?: ServiceVariation[] | null;
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
  // Backend memakai field `address` dan `is_default`.
  address: string;
  address_detail?: string;
  is_default: boolean;
  // Koordinat alamat (null untuk alamat lama yang belum di-pin di peta).
  lat?: number | null;
  lon?: number | null;
}

export default function BookingClient() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const username = params?.username as string;
  // Baris pra-pilih dari detail (?service_id[&variation_id]) atau keranjang
  // (?service_ids=a,b,c&variation_ids=x,y,z sejajar per indeks). Layanan yang
  // sama dengan variasi berbeda muncul sebagai baris terpisah (indeks berbeda),
  // jadi TIDAK di-collapse ke satu entri per service_id.
  const preselectedLines = useMemo(() => {
    const ids = (searchParams.get('service_ids') ?? searchParams.get('service_id') ?? '')
      .split(',').map((s) => s.trim());
    const vars = (searchParams.get('variation_ids') ?? searchParams.get('variation_id') ?? '')
      .split(',').map((s) => s.trim());
    const out: { serviceId: string; variationId?: string }[] = [];
    ids.forEach((sid, i) => { if (sid) out.push({ serviceId: sid, variationId: vars[i] || undefined }); });
    return out;
  }, [searchParams]);
  const removeCartItem = useCartStore((s) => s.removeItem);

  const [step, setStep] = useState(1);
  const [partner, setPartner] = useState<any>(null);
  const [services, setServices] = useState<PartnerService[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State — model per-BARIS. Kunci baris = `${serviceId}::${variationId ?? ''}`.
  // Layanan yang sama dengan variasi berbeda = dua baris terpisah (mendukung
  // keranjang yang memuat beberapa variasi dari satu layanan).
  const [selectedLines, setSelectedLines] = useState<Record<string, boolean>>({});
  // Kuantitas per BARIS (default min_order layanan bila belum di-set).
  const [quantities, setQuantities] = useState<Record<string, number>>({});
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
  const [showCancelPolicy, setShowCancelPolicy] = useState(false);
  
  // Slots State
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsReason, setSlotsReason] = useState<string>('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  
  // Refs
  const preselectedRef = useRef(false);
  // Ditandai saat pelanggan menekan "Edit" alamat (buka tab baru). Saat tab
  // order kembali fokus, kita refresh alamat + preview agar koordinat & biaya
  // transport ikut ter-update tanpa perlu reload manual.
  const addressEditedRef = useRef(false);
  const refreshOnReturnRef = useRef<() => void>(() => {});

  // ── Model baris (service_id + variation_id) ─────────────────────────────
  const KEY_SEP = '::';
  const lineKey = (serviceId: string, variationId?: string) => `${serviceId}${KEY_SEP}${variationId ?? ''}`;
  const parseKey = (key: string) => {
    const i = key.indexOf(KEY_SEP);
    const variationId = key.slice(i + KEY_SEP.length);
    return { serviceId: key.slice(0, i), variationId: variationId || undefined };
  };
  const serviceById = (id: string) => services.find((s) => s.id === id);
  const activeKeys = () => Object.keys(selectedLines).filter((k) => selectedLines[k]);
  const toggleLine = (serviceId: string, variationId?: string) =>
    setSelectedLines((prev) => {
      const key = lineKey(serviceId, variationId);
      return { ...prev, [key]: !prev[key] };
    });

  // Derived per-baris (dihitung sebelum efek agar bisa jadi dependency)
  const selectedCount = activeKeys().length;
  const minOrderOfKey = (key: string) => Math.max(1, serviceById(parseKey(key).serviceId)?.min_order ?? 1);
  const qtyOfKey = (key: string) => Math.max(minOrderOfKey(key), quantities[key] ?? minOrderOfKey(key));
  const setQtyKey = (key: string, qty: number) =>
    setQuantities((prev) => ({ ...prev, [key]: Math.max(minOrderOfKey(key), Math.min(100, qty)) }));
  const variationOfKey = (key: string) => {
    const { serviceId, variationId } = parseKey(key);
    return serviceById(serviceId)?.variations?.find((v) => v.id === variationId);
  };
  // Harga satuan baris = harga variasi bila ada, jika tidak harga dasar layanan.
  const unitPriceOfKey = (key: string) =>
    variationOfKey(key)?.price ?? serviceById(parseKey(key).serviceId)?.price ?? 0;
  const durationOfKey = (key: string) => {
    const s = serviceById(parseKey(key).serviceId);
    return s ? serviceDuration(s) || 0 : 0;
  };

  // Baris invalid = layanan bervariasi tapi variasinya kosong/basi (tak ada pada
  // daftar variasi terkini) → harus dipilih ulang sebelum lanjut/submit.
  const hasInvalidLine = () =>
    activeKeys().some((k) => {
      const { serviceId, variationId } = parseKey(k);
      const vars = serviceById(serviceId)?.variations ?? [];
      if (vars.length === 0) return false;
      return !variationId || !vars.some((v) => v.id === variationId);
    });

  const subtotal = useMemo(
    () => activeKeys().reduce((sum, k) => sum + unitPriceOfKey(k) * qtyOfKey(k), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [services, selectedLines, quantities],
  );
  const totalPayment = Math.max(0, subtotal - promoDiscount);

  // Mitra tidak boleh memesan layanan miliknya sendiri (uang berputar ke diri
  // sendiri dikurangi komisi + room chat gagal dibuat). Backend juga menolak
  // dengan SELF_ORDER; guard ini agar UX tidak menabrak error di akhir alur.
  const isOwnPartner =
    (!!user?.id && !!partner?.user_id && user.id === partner.user_id) ||
    (!!user?.partner_id && !!partner?.id && user.partner_id === partner.id);

  useEffect(() => {
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setIdempotencyKey(uuid);
  }, [selectedLines, date, time, addressId, notes, photos.length, promoCode]);

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
    if (preselectedLines.length > 0 && services.length > 0 && !preselectedRef.current) {
      const matched = preselectedLines.filter((pl) => services.some((s) => s.id === pl.serviceId));
      if (matched.length === 0) return;
      preselectedRef.current = true;

      // Bangun baris pra-pilih. Variasi diterapkan HANYA bila id-nya valid pada
      // daftar variasi terkini — id basi (mitra sudah mengedit layanan) dibiarkan
      // agar pelanggan memilih ulang di langkah 1 (cegah INVALID_VARIATION).
      const nextKeys: Record<string, boolean> = {};
      let needsPick = false;
      for (const pl of matched) {
        const s = services.find((x) => x.id === pl.serviceId)!;
        const vars = s.variations ?? [];
        if (vars.length === 0) {
          nextKeys[lineKey(s.id, undefined)] = true;
        } else if (pl.variationId && vars.some((v) => v.id === pl.variationId)) {
          nextKeys[lineKey(s.id, pl.variationId)] = true;
        } else {
          needsPick = true;
        }
      }
      if (Object.keys(nextKeys).length > 0) {
        setSelectedLines((prev) => ({ ...prev, ...nextKeys }));
      }
      // Lompat ke langkah 2 hanya bila tak ada variasi yang perlu dipilih ulang.
      setStep(needsPick ? 1 : 2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedLines, services]);

  const totalDuration = useMemo(
    () => activeKeys().reduce((sum, k) => sum + durationOfKey(k) * qtyOfKey(k), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [services, selectedLines, quantities],
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
            setSlotsReason(typeof data.reason === 'string' ? data.reason : '');
          } else {
            setAvailableSlots([]);
            setSlotsReason('');
          }
        } catch (err) {
          console.error('Failed to fetch schedule', err);
          setAvailableSlots([]);
          setSlotsReason('');
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
          const primary = addrList.find((a: Address) => a.is_default);
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

  // Muat ulang HANYA daftar alamat (mis. setelah pelanggan mengedit koordinat
  // di tab lain), mempertahankan alamat terpilih. Tidak ikut memuat mitra/
  // layanan agar ringan.
  const refreshAddresses = async () => {
    try {
      const aRes = await fetchAPI<any>('/users/me/addresses');
      if (aRes.success && aRes.data) {
        const addrList = unwrapData<Address[]>(aRes.data);
        if (Array.isArray(addrList)) setAddresses(addrList);
      }
    } catch (e) {
      console.error('Failed to refresh addresses', e);
    }
  };

  const handleNext = () => {
    if (hasInvalidLine()) {
      setErrorMsg('Pilih variasi untuk setiap layanan yang dipilih.');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };
  const handlePrev = () => setStep(1);

  const submitOrder = async () => {
    setErrorMsg('');

    // Guard: data partner wajib ada sebelum submit
    if (!partner?.id) {
      setErrorMsg('Data mitra belum termuat. Silakan muat ulang halaman.');
      return;
    }

    // Guard: tidak boleh memesan layanan milik sendiri
    if (isOwnPartner) {
      setErrorMsg('Kamu tidak dapat memesan layanan milik sendiri.');
      return;
    }

    const keys = activeKeys();
    if (keys.length === 0) {
      setErrorMsg('Pilih minimal satu layanan.');
      return;
    }

    if (!time || !availableSlots.includes(time)) {
      setErrorMsg('Waktu yang dipilih tidak tersedia pada tanggal ini.');
      return;
    }

    if (hasInvalidLine()) {
      setErrorMsg('Pilih variasi untuk setiap layanan yang dipilih.');
      return;
    }

    // Lead time validation for today
    const isToday = date === new Date().toISOString().split('T')[0];
    if (isToday) {
      const [hour, minute] = time.split(':').map(Number);
      const slotTime = new Date();
      slotTime.setHours(hour, minute, 0, 0);
      const minLeadTime = new Date();
      minLeadTime.setHours(minLeadTime.getHours() + 2);
      if (slotTime < minLeadTime) {
        setErrorMsg('Waktu pengerjaan untuk hari ini minimal 2 jam dari sekarang.');
        return;
      }
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
      // Satu item order per BARIS terpilih. variation_id hanya dikirim bila valid
      // pada variasi terkini (cegah id basi memicu INVALID_VARIATION).
      const items = keys.map((k) => {
        const { serviceId } = parseKey(k);
        const v = variationOfKey(k);
        return { service_id: serviceId, quantity: qtyOfKey(k), variation_id: v?.id };
      });
      const payload = {
        partner_id: partner.id,
        scheduled_at: `${date}T${time}:00+07:00`,
        address_id: addressId,
        notes: notes || undefined,
        // Kirim promo HANYA bila sudah tervalidasi (promoDiscount > 0 dari
        // preview). Mengirim kode mentah membuat total yang ditampilkan beda
        // dari yang ditagih: backend tetap menerapkan promo yang tidak pernah
        // muncul di ringkasan (atau menolak order dengan PROMO_NOT_FOUND).
        promo_code: promoDiscount > 0 && promoCode ? promoCode : undefined,
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
        // Bersihkan baris yang sudah dipesan dari keranjang (per service+variasi).
        for (const k of keys) {
          const { serviceId, variationId } = parseKey(k);
          removeCartItem(serviceId, variationId);
        }
        setSuccessMsg('Pesanan berhasil dibuat!');
        // replace: back dari detail pesanan tidak boleh kembali ke form
        // booking yang sudah ter-submit (membingungkan + rawan submit ulang).
        router.replace(`/orders/${order.id}`);
        return;
      }
      const msg = getErrorMessage(res);
      // Balapan langka: mitra mengubah variasi tepat saat pelanggan menekan
      // "Buat Pesanan" (data layanan di layar sudah basi). Muat ulang variasi
      // terkini, kosongkan pilihan basi, dan kembalikan ke langkah pemilihan.
      if (/INVALID_VARIATION|VARIATION_REQUIRED/.test(msg)) {
        setSelectedLines({});
        setStep(1);
        fetchData();
        setErrorMsg('Variasi layanan telah diperbarui oleh mitra. Silakan pilih ulang variasinya.');
      } else {
        setErrorMsg(msg);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async (currentPromo?: string) => {
    if (!partner?.id || !addressId || !date || !time) return;
    
    const items = activeKeys().map((k) => {
      const { serviceId } = parseKey(k);
      const v = variationOfKey(k);
      return { service_id: serviceId, quantity: qtyOfKey(k), variation_id: v?.id };
    });

    if (items.length === 0) return;
    // Jangan minta preview jika ada baris dengan variasi belum/ tak valid.
    if (hasInvalidLine()) return;

    setPreviewLoading(true);
    try {
      // Jadwal mitra selalu dalam WIB. Kirim offset +07:00 eksplisit —
      // sama persis dengan submitOrder — agar preview tidak bergeser
      // untuk pengguna di zona waktu non-WIB (WITA/WIT/luar negeri).
      const payload = {
        partner_id: partner.id,
        address_id: addressId,
        scheduled_at: `${date}T${time}:00+07:00`,
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
  }, [step, addressId, date, time, selectedLines, quantities]);

  const validatePromo = async () => {
    if (!promoCode) return;
    // fetchPreview mensyaratkan alamat + jadwal (butuh koordinat & waktu untuk
    // menghitung transport/diskon). Tanpa ini ia return diam-diam sehingga tombol
    // "Gunakan" terkesan tidak berfungsi — beri pesan yang jelas.
    if (!addressId || !date || !time) {
      setErrorMsg('Pilih alamat, tanggal, dan waktu terlebih dahulu sebelum memakai promo.');
      return;
    }
    await fetchPreview(promoCode);
  };

  // Jaga ref refresh selalu memakai closure terbaru (pola ref agar listener di
  // bawah tidak menangkap state basi).
  useEffect(() => {
    refreshOnReturnRef.current = () => {
      refreshAddresses().then(() => {
        if (step === 2) fetchPreview(promoDiscount > 0 ? promoCode : undefined);
      });
    };
  });

  // Saat pelanggan kembali ke tab order setelah mengedit alamat, refresh alamat
  // (peta) + preview (biaya transport) secara otomatis.
  useEffect(() => {
    const onReturn = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && addressEditedRef.current) {
        addressEditedRef.current = false;
        refreshOnReturnRef.current();
      }
    };
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
    };
  }, []);

  if (!isAuthenticated) return null;
  if (loading && step === 1) return <div className="page-h bg-[#f7f5f4] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" /></div>;

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  const selectedAddress = addresses.find((a) => a.id === addressId);
  const selectedKeyList = activeKeys();

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
        {promoCode && promoDiscount === 0 && (
          <p className="mt-2 text-xs text-[#9e8e8c]">
            Kode promo belum diterapkan — klik &quot;Gunakan&quot; untuk memvalidasi dan menerapkannya.
          </p>
        )}
      </div>
    </div>
  );

  // Section Kebijakan Pembatalan — ditampilkan di step 2 sebelum submit
  const cancelPolicySection = (
    <div className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden">
      <button
        className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-left"
        onClick={() => setShowCancelPolicy(v => !v)}
        aria-expanded={showCancelPolicy}
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#5b403e] shrink-0" />
          <span className="text-sm font-semibold text-[#1c1b1b]">Kebijakan Pembatalan & Refund</span>
        </div>
        {showCancelPolicy ? <ChevronUp className="w-4 h-4 text-[#9e8e8c]" /> : <ChevronDown className="w-4 h-4 text-[#9e8e8c]" />}
      </button>
      {showCancelPolicy && (
        <div className="px-4 pb-4 space-y-2 border-t border-[#e5e2e1] pt-3">
          <div className="flex items-start gap-2 text-sm">
            <span className="text-[#38A169] font-bold shrink-0 mt-0.5">✓</span>
            <span className="text-[#5b403e]"><strong>Kamu batalkan setelah membayar</strong> → Refund 80% biaya jasa + 100% biaya transport ke dompetmu</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-[#38A169] font-bold shrink-0 mt-0.5">✓</span>
            <span className="text-[#5b403e]"><strong>Mitra membatalkan / tidak datang (no-show)</strong> → Refund 100% biaya jasa + transport ke dompetmu</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-[#b51822] font-bold shrink-0 mt-0.5">✗</span>
            <span className="text-[#5b403e]"><strong>Tidak konfirmasi dalam 24 jam</strong> setelah selesai → Dana cair ke mitra</span>
          </div>
          <p className="text-xs text-[#9e8e8c] mt-2 pt-2 border-t border-[#e5e2e1]">Biaya admin/layanan platform tidak dikembalikan pada pembatalan.</p>
        </div>
      )}
    </div>
  );

  // Section Rincian Pembayaran — withAction=true menampilkan tombol submit (desktop)
  const summarySection = (withAction: boolean) => (
    <div className="bg-white rounded-xl border border-[#e5e2e1] p-4 space-y-3 shadow-sm">
      <h3 className="text-sm font-bold text-[#1c1b1b] border-b border-[#e5e2e1] pb-2">Rincian Pembayaran</h3>

      <div className="space-y-1.5">
        {selectedKeyList.map((k) => {
          const s = serviceById(parseKey(k).serviceId);
          if (!s) return null;
          const v = variationOfKey(k);
          return (
            <div key={k} className="flex justify-between gap-3 text-sm">
              <span className="text-[#5b403e] truncate">
                {s.name}
                {v && <span className="text-[#9e8e8c]"> ({v.name})</span>}
                <span className="text-[#9e8e8c]"> × {qtyOfKey(k)} {unitLabel(s.unit)}</span>
              </span>
              <span className="font-medium text-[#1c1b1b] shrink-0">{formatPrice(unitPriceOfKey(k) * qtyOfKey(k))}</span>
            </div>
          );
        })}
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
          {/* Escrow education banner */}
          <div className="p-3 bg-[#EBF8FF] border border-[#BEE3F8] rounded-lg flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#3182CE] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#2A6296]">Pembayaran 100% Aman — Escrow Posko Jasa</p>
              <p className="text-[11px] text-[#3182CE] mt-0.5 leading-snug">
                Uangmu <strong>ditahan oleh Posko Jasa</strong>, bukan langsung ke mitra. Dana baru cair setelah kamu konfirmasi pekerjaan selesai.
              </p>
            </div>
          </div>
          {/* No off-platform payment warning */}
          <div className="p-2.5 bg-[#FFFBEB] border border-[#F6E05E] rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#D69E2E] shrink-0" />
            <p className="text-[11px] text-[#744210]">
              Selalu bayar melalui platform. <strong>Jangan bayar cash/transfer langsung</strong> ke mitra — tidak ada perlindungan escrow.
            </p>
          </div>
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
            disabled={loading || !date || !time || !addressId || isOwnPartner}
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
      <div className="bg-white border-b border-[#e5e2e1] px-4 py-4 sticky top-0 z-10 lg:relative lg:z-auto">
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

            {isOwnPartner && (
              <div className="p-3 bg-[#FFF5F5] border border-[#FEB2B2] rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#E53E3E] shrink-0 mt-0.5" />
                <p className="text-xs text-[#742A2A] leading-snug">
                  <strong>Ini profil mitra kamu sendiri.</strong> Kamu tidak dapat memesan layanan milikmu sendiri.
                </p>
              </div>
            )}

            {/* Kartu layanan horizontal (selectable) */}
            <div className="space-y-3">
              {services.map(s => {
                const vars = s.variations ?? [];

                // Layanan TANPA variasi: satu kartu toggle = satu baris pesanan.
                if (vars.length === 0) {
                  const key = lineKey(s.id, undefined);
                  return (
                    <ServiceItemCard
                      key={s.id}
                      name={s.name}
                      price={s.price}
                      photoUrl={servicePhoto(s)}
                      durationMinutes={serviceDuration(s)}
                      selected={!!selectedLines[key]}
                      onSelect={() => toggleLine(s.id, undefined)}
                    />
                  );
                }

                // Layanan BERVARIASI: pilih satu ATAU LEBIH variasi — tiap chip
                // aktif jadi baris pesanan sendiri (bisa 2 variasi sekaligus).
                const anyActive = vars.some((v) => selectedLines[lineKey(s.id, v.id)]);
                return (
                  <div key={s.id} className={`rounded-xl border bg-white overflow-hidden ${anyActive ? 'border-[#b51822]' : 'border-[#e5e2e1]'}`}>
                    <div className="flex items-center gap-3 p-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#f0eded] shrink-0">
                        {servicePhoto(s) ? (
                          <Image src={servicePhoto(s)!} alt={s.name} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Tag className="w-4 h-4 text-[#9e8e8c]" /></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1c1b1b] truncate">{s.name}</p>
                        <p className="text-xs text-[#9e8e8c]">
                          Mulai Rp {Math.min(...vars.map((v) => v.price)).toLocaleString('id-ID')} · pilih variasi
                        </p>
                      </div>
                    </div>
                    <div className="px-3 pb-3 flex flex-wrap gap-2">
                      {vars.map((v) => {
                        const active = !!selectedLines[lineKey(s.id, v.id)];
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => toggleLine(s.id, v.id)}
                            className={`px-3 py-1.5 rounded border text-xs transition-colors ${active ? 'border-[#b51822] bg-[#FFF5F5] text-[#b51822]' : 'border-[#e5e2e1] text-[#5b403e] hover:border-[#b51822]/50'}`}
                          >
                            {v.name} · Rp {v.price.toLocaleString('id-ID')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-semibold text-[#1c1b1b] text-sm">{selectedAddress.label}</span>
                              {selectedAddress.is_default && <span className="text-[10px] bg-[#e5e2e1] text-[#5b403e] px-1.5 py-0.5 rounded font-medium">Utama</span>}
                            </div>
                            <p className="text-xs text-[#5b403e] leading-snug">{selectedAddress.address}</p>
                          </div>
                          {/* Edit koordinat/alamat — buka di tab baru agar isian pesanan tidak hilang. */}
                          <a
                            href={`/profile/addresses/edit/${selectedAddress.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => { addressEditedRef.current = true; }}
                            className="text-xs font-semibold text-[#b51822] hover:underline shrink-0"
                          >
                            Edit
                          </a>
                        </div>
                        {/* Peta verifikasi koordinat alamat yang dipilih. */}
                        {typeof selectedAddress.lat === 'number' && typeof selectedAddress.lon === 'number' &&
                        !(selectedAddress.lat === 0 && selectedAddress.lon === 0) ? (
                          <>
                            <MapView
                              lat={selectedAddress.lat}
                              lng={selectedAddress.lon}
                              label={selectedAddress.address}
                              className="h-40"
                              linkLabel="Buka di Google Maps"
                            />
                            <p className="text-[11px] text-[#9e8e8c] leading-snug">
                              Pastikan pin sudah tepat di lokasi pengerjaan — biaya transport dihitung dari titik ini. Jika kurang tepat, tekan <span className="font-semibold text-[#b51822]">Edit</span> untuk memindahkan pin.
                            </p>
                          </>
                        ) : (
                          <div className="p-2.5 bg-[#FFFBEB] border border-[#F6E05E] rounded-lg flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#D69E2E] shrink-0 mt-0.5" />
                            <p className="text-[11px] text-[#744210] leading-snug">
                              Alamat ini belum memiliki titik koordinat di peta. Tekan <span className="font-semibold">Edit</span> untuk menandai lokasi agar biaya transport akurat.
                            </p>
                          </div>
                        )}
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
                                {a.is_default && <span className="text-[10px] bg-[#e5e2e1] text-[#5b403e] px-1.5 py-0.5 rounded font-medium">Utama</span>}
                              </div>
                              <p className="text-xs text-[#5b403e] leading-snug">{a.address}</p>
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
                    <input type="date" value={date} onChange={e => { setDate(e.target.value); setTime(''); }} className="w-full p-2.5 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]" min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5b403e] mb-1.5">Waktu</label>
                    {slotsLoading ? (
                      <div className="text-sm text-[#5b403e] py-2">Memuat jadwal...</div>
                    ) : !date ? (
                      <div className="text-sm text-[#9e8e8c] py-2">Pilih tanggal terlebih dahulu</div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-sm text-red-600 py-2">
                        {slotsReason === 'day_off' && 'Mitra libur pada hari ini. Silakan pilih tanggal lain.'}
                        {slotsReason === 'no_schedule' && 'Mitra belum mengatur jadwal untuk hari ini. Silakan pilih tanggal lain.'}
                        {slotsReason === 'not_enough_time' && 'Total durasi layanan yang dipilih melebihi jam operasional mitra. Kurangi jumlah layanan atau pesan terpisah.'}
                        {slotsReason === 'fully_booked' && 'Jadwal mitra pada tanggal ini sudah penuh. Silakan pilih tanggal lain.'}
                        {!['day_off', 'no_schedule', 'not_enough_time', 'fully_booked'].includes(slotsReason) && 'Tidak ada jadwal tersedia pada tanggal ini'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        {availableSlots.map(t => {
                          const isToday = date === new Date().toISOString().split('T')[0];
                          const [hour, minute] = t.split(':').map(Number);
                          const slotTime = new Date();
                          slotTime.setHours(hour, minute, 0, 0);
                          const minLeadTime = new Date();
                          minLeadTime.setHours(minLeadTime.getHours() + 2);
                          const isDisabled = isToday && slotTime < minLeadTime;
                          
                          return (
                            <button key={t} onClick={() => setTime(t)} disabled={isDisabled} className={`py-1.5 rounded border text-sm font-medium transition-colors ${isDisabled ? 'border-[#e5e2e1] text-[#9e8e8c] bg-[#f7f5f4] opacity-50 cursor-not-allowed' : time === t ? 'border-[#b51822] bg-[#FFF5F5] text-[#b51822]' : 'border-[#e5e2e1] text-[#5b403e] hover:border-[#b51822]/50'}`}>
                              {t}
                            </button>
                          );
                        })}
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
                  {selectedKeyList.map((k) => {
                    const s = serviceById(parseKey(k).serviceId);
                    if (!s) return null;
                    const v = variationOfKey(k);
                    const qty = qtyOfKey(k);
                    const dur = serviceDuration(s) || 0;
                    return (
                    <div key={k} className="flex items-center gap-3 px-3 sm:px-4 py-2.5">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#f0eded] shrink-0">
                        {servicePhoto(s) ? (
                          <Image src={servicePhoto(s)!} alt={s.name} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Tag className="w-4 h-4 text-[#9e8e8c]" /></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1c1b1b] truncate">{s.name}</p>
                        {v && <p className="text-xs text-[#b51822] truncate">{v.name}</p>}
                        {dur ? <p className="text-xs text-[#9e8e8c]">± {dur * qty} menit</p> : null}
                        {/* Stepper kuantitas (jumlah jam / unit / jasa / kg) */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <button type="button" aria-label="Kurangi" onClick={() => setQtyKey(k, qty - 1)} disabled={qty <= minOrderOfKey(k)}
                            className="w-6 h-6 rounded border border-[#e5e2e1] flex items-center justify-center text-[#5b403e] hover:border-[#b51822]/50 disabled:opacity-40 disabled:cursor-not-allowed">−</button>
                          <span className="text-xs font-semibold text-[#1c1b1b] min-w-[3.5rem] text-center">{qty} {unitLabel(s.unit)}</span>
                          <button type="button" aria-label="Tambah" onClick={() => setQtyKey(k, qty + 1)} disabled={qty >= 100}
                            className="w-6 h-6 rounded border border-[#e5e2e1] flex items-center justify-center text-[#5b403e] hover:border-[#b51822]/50 disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                          {minOrderOfKey(k) > 1 && <span className="text-[10px] text-[#9e8e8c]">min {minOrderOfKey(k)}</span>}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-[#1c1b1b] shrink-0">{formatPrice(unitPriceOfKey(k) * qty)}</p>
                    </div>
                    );
                  })}
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
                {cancelPolicySection}
                {promoSection}
                {summarySection(false)}
              </div>
            </div>

            {/* Kolom kanan (desktop): promo + ringkasan sticky + tombol submit */}
            <aside className="hidden lg:block lg:sticky lg:top-44 space-y-4">
              {cancelPolicySection}
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
                <p className="text-xs text-[#9e8e8c]">Subtotal <span className="text-[10px] italic">(belum term. ongkos & admin)</span></p>
                <p className="text-lg font-bold text-[#b51822]">{formatPrice(subtotal)}</p>
              </div>
              <Button
                className="bg-[#b51822] hover:bg-[#90121a] rounded px-8"
                onClick={handleNext}
                disabled={selectedCount === 0 || isOwnPartner}
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
                disabled={loading || !date || !time || !addressId || isOwnPartner}
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

