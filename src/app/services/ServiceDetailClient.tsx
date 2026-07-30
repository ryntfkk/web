'use client';

import { useToast } from '@/components/ui/toast';
import { getInitial } from '@/lib/utils';
import { Suspense, useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star,
  ShoppingCart,
  Check,
  Zap,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Tag,
  Heart,
  Share2,
  X,
  MapPin,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StickyActionBar } from '@/components/ui/sticky-action-bar';
import { fetchAPI } from '@/lib/api';
import { formatRupiah } from '@/lib/format';
import { useServiceDetail, usePartnerWorkingHours } from '@/hooks/useServiceDetail';
import { useFavoriteServices, useFavoritesActions } from '@/hooks/useFavorites';
import { useCartStore } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useRecentlyViewedStore } from '@/lib/store/recentlyViewedStore';
import ScheduleView from '@/components/service/ScheduleView';
import MoreFromPartner from '@/components/service/MoreFromPartner';
import SimilarServices from '@/components/service/SimilarServices';
import { PLACEHOLDER_SERVICE } from '@/lib/images';
import { unitLabel } from '@/lib/order-utils';
import { formatDistanceMeters } from '@/lib/distance';




function DetailContent({ serviceId: serviceIdProp }: { serviceId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Prioritas prop (route /services/[id]); fallback ?id= agar URL lama tetap jalan.
  const serviceId = serviceIdProp || searchParams.get('id') || '';
  const distanceStr = searchParams.get('distance');
  const distance = distanceStr ? formatDistanceMeters(Number(distanceStr)) : null;

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  // Variasi terpilih (Shopee-style). Kosong = belum memilih.
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');
  const carouselRef = useRef<HTMLDivElement>(null);

  // Halaman ini publik — auth hanya dicek saat user melakukan aksi
  // (tambah keranjang / pesan), bukan saat melihat halaman.
  const { isAuthenticated } = useAuthStore();
  const { addItem, removeItem, isInCart } = useCartStore();

  const { data: service, isLoading, isError, refetch } = useServiceDetail(serviceId);
  const { data: workingHours, isLoading: hoursLoading } = usePartnerWorkingHours(service?.partner_id);

  // In-cart per (layanan, variasi terpilih): variasi berbeda = item terpisah.
  const inCart = service ? isInCart(service.id, selectedVariationId || undefined) : false;

  // Catat ke "Baru Dilihat" (localStorage) tiap kali detail layanan dibuka.
  const recordView = useRecentlyViewedStore((s) => s.record);
  useEffect(() => {
    if (!service) return;
    recordView({
      service_id: service.id,
      service_name: service.name,
      price: service.price,
      photo_url: service.photo_url || PLACEHOLDER_SERVICE,
      partner_username: service.partner_username,
      category_name: service.category_name,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.id]);

  // Favorit
  const { data: favServices } = useFavoriteServices();
  const { addService, removeService } = useFavoritesActions();
  const [favBusy, setFavBusy] = useState(false);
  const { showToast } = useToast();


  const isFav = !!(service && favServices?.some((f) => f.service_id === service.id));

  const handleFavToggle = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/services/${serviceId}`)}`);
      return;
    }
    if (!service || favBusy) return;
    setFavBusy(true);
    let res;
    try {
      if (isFav) {
        res = await removeService(service.id);
      } else {
        res = await addService(service.id);
      }
      if (!res.success) {
        showToast(res.message || 'Gagal mengubah favorit', 'error');
      }
    } finally {
      setFavBusy(false);
    }
  };

  const handleCartToggle = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/services/${serviceId}`)}`);
      return;
    }
    if (!service) return;

    if (inCart) {
      removeItem(service.id, selectedVariationId || undefined);
      showToast('Dihapus dari keranjang', 'info');
    } else {
      const vars = service.variations ?? [];
      if (vars.length > 0 && !selectedVariationId) {
        showToast('Silakan pilih variasi terlebih dahulu', 'error');
        return;
      }
      const v = vars.find((x) => x.id === selectedVariationId);
      addItem({
        service_id: service.id,
        partner_id: service.partner_id,
        partner_username: service.partner_username,
        service_name: service.name,
        price: v?.price ?? service.price,
        photo_url: service.photo_url || PLACEHOLDER_SERVICE,
        variation_id: v?.id,
        variation_name: v?.name,
      });
      showToast(v ? `${service.name} (${v.name}) masuk keranjang` : `${service.name} masuk keranjang`, 'success');
    }
  };

  const handleOrderNow = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/services/${serviceId}`)}`);
      return;
    }
    if (!service) return;
    const vars = service.variations ?? [];
    if (vars.length > 0 && !selectedVariationId) {
      showToast('Silakan pilih variasi terlebih dahulu', 'error');
      return;
    }
    const q = selectedVariationId ? `&variation_id=${selectedVariationId}` : '';
    router.push(`/book/${service.partner_username}?service_id=${service.id}${q}`);
  };

  // Chat langsung dengan mitra dari halaman detail (pola sama dengan ProfileHeader).
  const [chatBusy, setChatBusy] = useState(false);
  const handleChat = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/services/${serviceId}`)}`);
      return;
    }
    if (!service || chatBusy) return;
    setChatBusy(true);
    try {
      const res = await fetchAPI<{ room_id: string }>('/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({ partner_id: service.partner_id }),
      });
      if (res.success && res.data?.room_id) {
        router.push(`/chat/${res.data.room_id}`);
      } else {
        showToast('Gagal memulai obrolan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat memulai obrolan', 'error');
    } finally {
      setChatBusy(false);
    }
  };

  const photoCount = service?.photos?.length ?? 0;

  const scrollToPhoto = (idx: number) => {
    setCurrentPhotoIndex(idx);
    const el = carouselRef.current;
    if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  const nextPhoto = () => {
    if (photoCount > 1) scrollToPhoto(currentPhotoIndex === photoCount - 1 ? 0 : currentPhotoIndex + 1);
  };

  const prevPhoto = () => {
    if (photoCount > 1) scrollToPhoto(currentPhotoIndex === 0 ? photoCount - 1 : currentPhotoIndex - 1);
  };

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== currentPhotoIndex) setCurrentPhotoIndex(idx);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: service?.name, url });
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch { /* clipboard unavailable */ }
    }
  };

  // ── No ID ───────────────────────────────────────────────────────
  if (!serviceId) {
    return (
      <div className="page-h bg-brand-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-brand-red-light flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-brand-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-brand-gray-900 mb-1">Layanan Tidak Ditemukan</h2>
          <p className="text-sm text-brand-gray-700 mb-4">Pilih layanan dari katalog kami.</p>
          <Button onClick={() => router.push('/')} className="bg-brand-red hover:bg-brand-red-dark text-white h-9 px-5 rounded-md text-sm">
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="page-h bg-brand-gray-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <div className="w-full aspect-square bg-brand-gray-100 rounded-md animate-pulse" />
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              <div className="h-6 bg-brand-gray-100 rounded-md animate-pulse w-3/4" />
              <div className="h-4 bg-brand-gray-100 rounded-md animate-pulse w-1/2" />
              <div className="h-10 bg-brand-gray-100 rounded-md animate-pulse w-1/3 mt-6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────
  if (isError || !service) {
    return (
      <div className="page-h bg-brand-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-brand-error-soft flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-brand-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-brand-gray-900 mb-1">Gagal Memuat</h2>
          <p className="text-sm text-brand-gray-700 mb-4">Tidak dapat memuat detail layanan.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => refetch()} className="border-brand-gray-100 h-9 px-4 rounded-md text-sm">Coba Lagi</Button>
            <Button onClick={() => router.push('/')} className="bg-brand-red hover:bg-brand-red-dark text-white h-9 px-4 rounded-md text-sm">Kembali</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal ───────────────────────────────────────────────────────
  const mainPhoto = service.photo_url || PLACEHOLDER_SERVICE;
  const hasMultiplePhotos = !!service.photos && service.photos.length > 1;
  const allPhotos = hasMultiplePhotos ? service.photos : [{ id: 'main', photo_url: mainPhoto }];
  const includedItems = service.included_items ?? [];
  const excludedItems = service.excluded_items ?? [];

  // Variasi (Shopee-style). Harga besar mengikuti variasi terpilih; sebelum
  // memilih, tampilkan harga termurah (= service.price dari backend).
  const variations = service.variations ?? [];
  const hasVariations = variations.length > 0;
  const selectedVariation = variations.find((v) => v.id === selectedVariationId) ?? null;
  const displayPrice = selectedVariation?.price ?? service.price;
  const minOrder = service.min_order ?? 1;

  return (
    <div className="page-h bg-brand-gray-60 pb-20 sm:pb-4">
      <div className="max-w-6xl mx-auto px-0 sm:px-4 py-0 sm:py-3">
        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-brand-gray-700 mb-3 px-4 py-2">
          <Link href="/" className="hover:text-brand-red">Beranda</Link>
          <span>/</span>
          <Link href="/search" className="hover:text-brand-red">Layanan</Link>
          <span>/</span>
          <span className="text-brand-gray-900">{service.category_name}</span>
        </div>

        {/* Main Content - Shopee Style */}
        <div className="bg-white sm:rounded-md sm:shadow-sm">
          <div className="flex flex-col md:flex-row">
            {/* Left: Images */}
            <div className="w-full md:w-[42%] p-3 sm:p-4">
              {/* Main Image — swipeable carousel (all photos) */}
              <div className="relative w-full aspect-square bg-brand-gray-25 rounded-md overflow-hidden group">
                {/* Distance Badge */}
                {distance && (
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded flex items-center gap-1 z-10">
                    <MapPin className="w-3 h-3" />
                    <span className="text-[11px] sm:text-[12px] font-medium leading-none">{distance}</span>
                  </div>
                )}
                
                <div
                  ref={carouselRef}
                  onScroll={handleCarouselScroll}
                  className="flex w-full h-full overflow-x-auto snap-x snap-mandatory"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {allPhotos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="relative min-w-full h-full snap-center cursor-pointer"
                      onClick={() => hasMultiplePhotos && setShowGallery(true)}
                    >
                      <Image
                        src={photo.photo_url}
                        alt={`${service.name} — foto ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority={idx === 0}
                      />
                    </div>
                  ))}
                </div>


                {/* Navigation */}
                {hasMultiplePhotos && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                      <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                    {/* Dots (mobile) */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex sm:hidden gap-1.5">
                      {allPhotos.map((_, idx) => (
                        <span key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentPhotoIndex ? 'bg-white' : 'bg-white/40'}`} />
                      ))}
                    </div>
                    <div className="absolute bottom-2 right-2 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 text-xs text-white bg-black/50 px-2 py-0.5 rounded-full pointer-events-none">
                      {currentPhotoIndex + 1}/{allPhotos.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {hasMultiplePhotos && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {allPhotos.map((photo, idx) => (
                    <button key={photo.id} onClick={() => scrollToPhoto(idx)}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden transition-all ${idx === currentPhotoIndex ? '' : 'opacity-60 hover:opacity-100'}`}>
                      <Image src={photo.photo_url} alt={`Foto ${idx + 1}`} fill className="object-cover" sizes="64px" />
                      {idx === currentPhotoIndex && (
                        <div className="absolute inset-0 rounded-md ring-2 ring-inset ring-brand-red pointer-events-none" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Share & Favorite */}
              <div className="hidden sm:flex items-center gap-4 mt-4 pt-3 border-t border-brand-gray-100">
                <span className="text-xs text-brand-gray-700">Bagikan:</span>
                <button onClick={handleShare} className="flex items-center gap-1 text-xs text-brand-gray-700 hover:text-brand-red">
                  <Share2 className="w-3.5 h-3.5" />
                  {shareCopied ? 'Tersalin!' : 'Share'}
                </button>
                <button
                  onClick={handleFavToggle}
                  disabled={favBusy}
                  className={`flex items-center gap-1 text-xs hover:text-brand-red disabled:opacity-50 ${
                    isFav ? 'text-brand-red' : 'text-brand-gray-700'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                  {isFav ? 'Tersimpan' : 'Favorit'}
                </button>
              </div>
            </div>

            {/* Right: Info */}
            <div className="flex-1 p-3 sm:p-4 sm:pl-0">
              {/* Title & Location */}
              <div className="mb-3">
                <h1 className="text-lg sm:text-xl font-semibold text-brand-gray-900 leading-tight mb-2">
                  {service.name}
                </h1>
                <div className="flex items-center gap-3 text-xs text-brand-gray-700">
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>{service.category_name}</span>
                  </div>
                </div>
              </div>

              {/* Rating, Reviews, Estimasi & Share */}
              <div className="flex items-center justify-between gap-2 py-2.5 px-3 bg-brand-gray-25 rounded-md mb-4">
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-brand-warning text-brand-warning" />
                    <span className="font-semibold text-brand-gray-900">{(service.partner_avg_rating ?? 0).toFixed(1)}</span>
                  </div>
                  <div className="w-px h-4 bg-brand-gray-100" />
                  <span className="text-sm text-brand-gray-700">{service.partner_total_reviews} Ulasan</span>
                  <div className="w-px h-4 bg-brand-gray-100" />
                  <span className="flex items-center gap-1 text-sm text-brand-gray-700">
                    <Clock className="w-3.5 h-3.5" />
                    Estimasi {service.estimated_duration} menit
                  </span>
                </div>
                <button
                  onClick={handleShare}
                  aria-label="Bagikan layanan"
                  className="flex-shrink-0 p-1.5 hover:bg-brand-red-light rounded-full text-brand-gray-700 hover:text-brand-red transition-colors"
                >
                  {shareCopied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Price */}
              <div className="bg-brand-gray-60 p-3 rounded-md mb-4">
                <span className="text-xs text-brand-gray-700">Harga</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-bold text-brand-red">
                    {formatRupiah(displayPrice)}
                  </span>
                  <span className="text-sm font-normal text-brand-gray-700">/{unitLabel(service.unit)}</span>
                </div>
                {minOrder > 1 && (
                  <p className="text-xs text-brand-gray-700 mt-1">Min. order {minOrder} {unitLabel(service.unit)}</p>
                )}
              </div>

              {/* Variasi (Shopee-style chips) */}
              {hasVariations && (
                <div className="mb-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="text-sm font-semibold text-brand-gray-900">Pilih Variasi</h3>
                    {!selectedVariation && (
                      <span className="text-xs text-brand-red">Wajib dipilih</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variations.map((v) => {
                      const active = v.id === selectedVariationId;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariationId(active ? '' : v.id)}
                          className={`px-3 py-2 rounded-md border text-sm text-left transition-colors ${
                            active
                              ? 'border-brand-red bg-brand-red-light text-brand-red'
                              : 'border-brand-gray-100 text-brand-gray-900 hover:border-brand-red/50'
                          }`}
                        >
                          <span className="font-medium">{v.name}</span>
                          <span className="block text-xs text-brand-gray-700">{formatRupiah(v.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Info */}
              <div className="mb-4">
                <button onClick={() => setShowSchedule(true)}
                  className="inline-flex items-center gap-2 h-9 px-3 bg-white border border-brand-gray-100 rounded-md hover:border-brand-red transition-colors text-sm text-brand-gray-900">
                  <Calendar className="w-4 h-4 text-brand-red" />
                  Lihat Jadwal
                </button>
              </div>

              {/* Partner */}
              <Link href={`/${service.partner_username}`}
                className="flex items-center justify-between p-3 bg-brand-gray-25 rounded-md hover:bg-brand-red-light transition-colors mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-brand-gray-100 overflow-hidden flex-shrink-0">
                    {service.partner_avatar_url ? (
                      <Image src={service.partner_avatar_url} alt={service.partner_name} width={48} height={48} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-brand-gray-700">
                        {getInitial(service.partner_name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-gray-900 truncate">{service.partner_name}</p>
                    {service.partner_city && (
                      <div className="flex items-center gap-1 text-xs text-brand-gray-700 mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{service.partner_city}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  <span className="text-[11px] font-medium text-brand-red bg-white border border-brand-red px-2.5 py-1.5 rounded-md">Lihat Profil</span>
                </div>
              </Link>

              {/* Action Buttons */}
              <div className="hidden sm:flex gap-2">
                <Button
                  variant="outline"
                  aria-label="Chat mitra"
                  className="h-11 w-11 p-0 shrink-0"
                  onClick={handleChat}
                  isLoading={chatBusy}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  className={`flex-1 h-11 text-sm font-medium ${inCart ? 'border-brand-success text-brand-success-dark bg-brand-success-soft' : ''}`}
                  onClick={handleCartToggle}
                >
                  {inCart ? <><Check className="w-4 h-4 mr-1.5" /> Ditambahkan</> : <><ShoppingCart className="w-4 h-4 mr-1.5" /> Masukan Keranjang</>}
                </Button>
                <Button
                  className="flex-1 h-11 text-sm"
                  onClick={handleOrderNow}
                >
                  <Zap className="w-4 h-4 mr-1.5" />
                  Pesan Sekarang
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Section: Specs, Description & Details */}
          <div className="border-t border-brand-gray-100 p-4">
            {/* Informasi Layanan (spesifikasi lengkap dari database) */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-brand-gray-900 mb-2">Informasi Layanan</h3>
              <div className="divide-y divide-brand-red-light text-sm">
                <div className="flex py-2">
                  <span className="w-40 flex-shrink-0 text-brand-gray-700">Kategori</span>
                  <span className="text-brand-gray-900">{service.category_name}</span>
                </div>
                <div className="flex py-2">
                  <span className="w-40 flex-shrink-0 text-brand-gray-700">Estimasi Waktu Kerja</span>
                  <span className="text-brand-gray-900">{service.estimated_duration} menit</span>
                </div>
                <div className="flex py-2">
                  <span className="w-40 flex-shrink-0 text-brand-gray-700">Harga</span>
                  <span className="text-brand-gray-900">{formatRupiah(displayPrice)} <span className="text-brand-gray-700">/{unitLabel(service.unit)}</span></span>
                </div>
                {minOrder > 1 && (
                  <div className="flex py-2">
                    <span className="w-40 flex-shrink-0 text-brand-gray-700">Minimal Order</span>
                    <span className="text-brand-gray-900">{minOrder} {unitLabel(service.unit)}</span>
                  </div>
                )}
                <div className="flex py-2">
                  <span className="w-40 flex-shrink-0 text-brand-gray-700">Mitra</span>
                  <Link href={`/${service.partner_username}`} className="text-brand-red hover:underline">
                    {service.partner_name}
                  </Link>
                </div>
                <div className="flex py-2">
                  <span className="w-40 flex-shrink-0 text-brand-gray-700">Rating Mitra</span>
                  <span className="text-brand-gray-900">
                    {(service.partner_avg_rating ?? 0).toFixed(1)} ({service.partner_total_reviews} ulasan)
                  </span>
                </div>
                <div className="flex py-2">
                  <span className="w-40 flex-shrink-0 text-brand-gray-700">Jumlah Foto</span>
                  <span className="text-brand-gray-900">{allPhotos.length}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {service.description && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-brand-gray-900 mb-2">Deskripsi Layanan</h3>
                <p className="text-sm text-brand-gray-700 whitespace-pre-line leading-relaxed">
                  {service.description}
                </p>
              </div>
            )}

            {/* Included / Excluded */}
            {(includedItems.length > 0 || excludedItems.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {includedItems.length > 0 && (
                  <div className="p-3 bg-green-50 rounded-md">
                    <h4 className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Yang Termasuk
                    </h4>
                    <ul className="space-y-1">
                      {includedItems.map((item, i) => (
                        <li key={i} className="text-xs text-green-700">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {excludedItems.length > 0 && (
                  <div className="p-3 bg-red-50 rounded-md">
                    <h4 className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Yang Tidak Termasuk
                    </h4>
                    <ul className="space-y-1">
                      {excludedItems.map((item, i) => (
                        <li key={i} className="text-xs text-red-600">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cross-sell: layanan lain dari mitra yang sama */}
        <MoreFromPartner username={service.partner_username} excludeId={service.id} />

        {/* Rekomendasi: layanan serupa dari mitra lain (kategori sama) */}
        <SimilarServices
          categoryId={service.category_id}
          excludeServiceId={service.id}
          excludePartnerId={service.partner_id}
        />
      </div>

      {/* Mobile Action Bar — sticky bawah (Fase 1); desktop pakai tombol di panel info. */}
      <StickyActionBar className="sm:hidden">
        <Button
          variant="outline"
          aria-label="Chat mitra"
          className="flex-shrink-0 h-10 w-10 p-0"
          onClick={handleChat}
          isLoading={chatBusy}
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          disabled={favBusy}
          aria-label={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
          className={`flex-shrink-0 h-10 w-10 p-0 disabled:opacity-50 ${isFav ? 'border-brand-red text-brand-red bg-brand-red-light' : ''}`}
          onClick={handleFavToggle}
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
        </Button>
        <Button
          variant="outline"
          aria-label={inCart ? 'Hapus dari keranjang' : 'Tambah ke keranjang'}
          className={`flex-shrink-0 h-10 w-10 p-0 ${inCart ? 'border-brand-success text-brand-success bg-brand-success-soft' : ''}`}
          onClick={handleCartToggle}
        >
          {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-brand-red">{formatRupiah(displayPrice)}<span className="text-xs font-normal text-brand-gray-700">/{unitLabel(service.unit)}</span></p>
          {hasVariations && selectedVariation && (
            <p className="text-[11px] text-brand-gray-700 truncate">{selectedVariation.name}</p>
          )}
        </div>
        <Button className="h-10 px-5 text-sm" onClick={handleOrderNow}>
          <Zap className="w-3.5 h-3.5 mr-1.5" /> Pesan
        </Button>
      </StickyActionBar>

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowSchedule(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            {/* top-0: sticky di sini relatif terhadap modal (max-h-[80vh]
                overflow-auto), bukan terhadap viewport — top-16 membuat judulnya
                mengambang 64px dari tepi atas modal saat isinya di-scroll. */}
            <div className="sticky top-0 bg-white border-b border-brand-gray-100 px-4 py-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-brand-gray-900">Jadwal {service.partner_name}</h2>
              <button onClick={() => setShowSchedule(false)} className="p-1 hover:bg-brand-red-light rounded-full">
                <X className="w-5 h-5 text-brand-gray-700" />
              </button>
            </div>
            <div className="p-4">
              <ScheduleView workingHours={workingHours} isLoading={hoursLoading} />
            </div>
          </div>
        </div>
      )}


      {/* Gallery Modal */}
      {showGallery && hasMultiplePhotos && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center" onClick={() => setShowGallery(false)}>
          <button onClick={() => setShowGallery(false)} className="absolute top-3 right-3 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white z-10">
            <X className="w-6 h-6" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="relative w-full h-full max-w-3xl max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <Image src={allPhotos[currentPhotoIndex].photo_url} alt={`Foto ${currentPhotoIndex + 1}`} fill className="object-contain" sizes="100vw" />
          </div>
          <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white">
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {allPhotos.map((_, idx) => (
              <button key={idx} onClick={(e) => { e.stopPropagation(); scrollToPhoto(idx); }}
                className={`w-2 h-2 rounded-full transition-all ${idx === currentPhotoIndex ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white font-medium bg-black/50 px-3 py-1 rounded-full">
            {currentPhotoIndex + 1} / {allPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}

// `serviceId` opsional: dipakai route baru /services/[id] (SSR + metadata).
// Bila tidak diberikan, komponen jatuh kembali ke query param ?id= (URL lama
// tetap berfungsi) — lihat DetailContent.
export default function ServiceDetailClient({ serviceId }: { serviceId?: string }) {
  return (
    <Suspense fallback={<div className="p-4 text-center">Memuat layanan...</div>}>
      <DetailContent serviceId={serviceId} />
    </Suspense>
  );
}