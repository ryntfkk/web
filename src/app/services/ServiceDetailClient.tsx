'use client';

import { Suspense, useRef, useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServiceDetail, usePartnerWorkingHours } from '@/hooks/useServiceDetail';
import { useFavoriteServices, useFavoritesActions } from '@/hooks/useFavorites';
import { useCartStore } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';
import ScheduleView from '@/components/service/ScheduleView';


const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';

function DetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('id') || '';
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Halaman ini publik — auth hanya dicek saat user melakukan aksi
  // (tambah keranjang / pesan), bukan saat melihat halaman.
  const { isAuthenticated } = useAuthStore();
  const { addItem, removeItem, isInCart } = useCartStore();

  const { data: service, isLoading, isError, refetch } = useServiceDetail(serviceId);
  const { data: workingHours, isLoading: hoursLoading } = usePartnerWorkingHours(service?.partner_id);

  const inCart = service ? isInCart(service.id) : false;

  // Favorit
  const { data: favServices } = useFavoriteServices();
  const { addService, removeService } = useFavoritesActions();
  const [favBusy, setFavBusy] = useState(false);
  const isFav = !!(service && favServices?.some((f) => f.service_id === service.id));

  const handleFavToggle = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/services?id=${serviceId}`)}`);
      return;
    }
    if (!service || favBusy) return;
    setFavBusy(true);
    try {
      if (isFav) {
        await removeService(service.id);
      } else {
        await addService(service.id);
      }
    } finally {
      setFavBusy(false);
    }
  };

  const handleCartToggle = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/services?id=${serviceId}`)}`);
      return;
    }
    if (!service) return;

    if (inCart) {
      removeItem(service.id);
    } else {
      addItem({
        service_id: service.id,
        partner_id: service.partner_id,
        partner_username: service.partner_username,
        service_name: service.name,
        price: service.price,
        photo_url: service.photo_url || PLACEHOLDER_IMG,
      });
    }
  };

  const handleOrderNow = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/services?id=${serviceId}`)}`);
      return;
    }
    if (!service) return;
    router.push(`/book/${service.partner_username}?service_id=${service.id}`);
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
      <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[#f0eded] flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-[#5b403e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[#1c1b1b] mb-1">Layanan Tidak Ditemukan</h2>
          <p className="text-sm text-[#5b403e] mb-4">Pilih layanan dari katalog kami.</p>
          <Button onClick={() => router.push('/')} className="bg-[#b51822] hover:bg-[#90121a] text-white h-9 px-5 rounded-[4px] text-sm">
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fcf9f8]">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <div className="w-full aspect-square bg-[#e5e2e1] rounded-[4px] animate-pulse" />
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              <div className="h-6 bg-[#e5e2e1] rounded-[4px] animate-pulse w-3/4" />
              <div className="h-4 bg-[#e5e2e1] rounded-[4px] animate-pulse w-1/2" />
              <div className="h-10 bg-[#e5e2e1] rounded-[4px] animate-pulse w-1/3 mt-6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────
  if (isError || !service) {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[#1c1b1b] mb-1">Gagal Memuat</h2>
          <p className="text-sm text-[#5b403e] mb-4">Tidak dapat memuat detail layanan.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => refetch()} className="border-[#e5e2e1] h-9 px-4 rounded-[4px] text-sm">Coba Lagi</Button>
            <Button onClick={() => router.push('/')} className="bg-[#b51822] hover:bg-[#90121a] text-white h-9 px-4 rounded-[4px] text-sm">Kembali</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal ───────────────────────────────────────────────────────
  const mainPhoto = service.photo_url || PLACEHOLDER_IMG;
  const hasMultiplePhotos = !!service.photos && service.photos.length > 1;
  const allPhotos = hasMultiplePhotos ? service.photos : [{ id: 'main', photo_url: mainPhoto }];
  const includedItems = service.included_items ?? [];
  const excludedItems = service.excluded_items ?? [];

  return (
    <div className="min-h-screen bg-[#f0f0f0] pb-20 sm:pb-4">
      <div className="max-w-6xl mx-auto px-0 sm:px-4 py-0 sm:py-3">
        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#5b403e] mb-3 px-4 py-2">
          <Link href="/" className="hover:text-[#b51822]">Beranda</Link>
          <span>/</span>
          <Link href="/search" className="hover:text-[#b51822]">Layanan</Link>
          <span>/</span>
          <span className="text-[#1c1b1b]">{service.category_name}</span>
        </div>

        {/* Main Content - Shopee Style */}
        <div className="bg-white sm:rounded-[4px] sm:shadow-sm">
          <div className="flex flex-col md:flex-row">
            {/* Left: Images */}
            <div className="w-full md:w-[42%] p-3 sm:p-4">
              {/* Main Image — swipeable carousel (all photos) */}
              <div className="relative w-full aspect-square bg-[#fafafa] rounded-[4px] overflow-hidden group">
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

                {/* Badge */}
                <div className="absolute top-0 left-0 bg-[#b51822] text-white text-xs px-2 py-1 rounded-br-[4px] pointer-events-none">
                  Favorit
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
                      className={`relative flex-shrink-0 w-14 h-14 rounded-[4px] overflow-hidden transition-all ${idx === currentPhotoIndex ? 'ring-2 ring-[#b51822]' : 'opacity-60 hover:opacity-100'}`}>
                      <Image src={photo.photo_url} alt={`Foto ${idx + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Share & Favorite */}
              <div className="hidden sm:flex items-center gap-4 mt-4 pt-3 border-t border-[#e5e2e1]">
                <span className="text-xs text-[#5b403e]">Bagikan:</span>
                <button onClick={handleShare} className="flex items-center gap-1 text-xs text-[#5b403e] hover:text-[#b51822]">
                  <Share2 className="w-3.5 h-3.5" />
                  {shareCopied ? 'Tersalin!' : 'Share'}
                </button>
                <button
                  onClick={handleFavToggle}
                  disabled={favBusy}
                  className={`flex items-center gap-1 text-xs hover:text-[#b51822] disabled:opacity-50 ${
                    isFav ? 'text-[#b51822]' : 'text-[#5b403e]'
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
                <h1 className="text-lg sm:text-xl font-semibold text-[#1c1b1b] leading-tight mb-2">
                  {service.name}
                </h1>
                <div className="flex items-center gap-3 text-xs text-[#5b403e]">
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>{service.category_name}</span>
                  </div>
                </div>
              </div>

              {/* Rating, Reviews, Estimasi & Share */}
              <div className="flex items-center justify-between gap-2 py-2.5 px-3 bg-[#fafafa] rounded-[4px] mb-4">
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-[#D69E2E] text-[#D69E2E]" />
                    <span className="font-semibold text-[#1c1b1b]">{(service.partner_avg_rating ?? 0).toFixed(1)}</span>
                  </div>
                  <div className="w-px h-4 bg-[#e5e2e1]" />
                  <span className="text-sm text-[#5b403e]">{service.partner_total_reviews} Ulasan</span>
                  <div className="w-px h-4 bg-[#e5e2e1]" />
                  <span className="flex items-center gap-1 text-sm text-[#5b403e]">
                    <Clock className="w-3.5 h-3.5" />
                    Estimasi {service.estimated_duration} menit
                  </span>
                </div>
                <button
                  onClick={handleShare}
                  aria-label="Bagikan layanan"
                  className="flex-shrink-0 p-1.5 hover:bg-[#f0eded] rounded-full text-[#5b403e] hover:text-[#b51822] transition-colors"
                >
                  {shareCopied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Price */}
              <div className="bg-[#fafafa] p-3 rounded-[4px] mb-4">
                <span className="text-xs text-[#5b403e]">Harga</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-bold text-[#b51822]">
                    Rp {service.price.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Quick Info */}
              <div className="mb-4">
                <button onClick={() => setShowSchedule(true)}
                  className="inline-flex items-center gap-2 h-9 px-3 bg-white border border-[#e5e2e1] rounded-[4px] hover:border-[#b51822] transition-colors text-sm text-[#1c1b1b]">
                  <Calendar className="w-4 h-4 text-[#b51822]" />
                  Lihat Jadwal
                </button>
              </div>

              {/* Partner */}
              <Link href={`/${service.partner_username}`}
                className="flex items-center gap-3 p-3 bg-[#fafafa] rounded-[4px] hover:bg-[#f0eded] transition-colors mb-4">
                <div className="w-12 h-12 rounded-full bg-[#e5e2e1] overflow-hidden flex-shrink-0">
                  {service.partner_avatar_url ? (
                    <Image src={service.partner_avatar_url} alt={service.partner_name} width={48} height={48} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-[#5b403e]">
                      {service.partner_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1c1b1b]">{service.partner_name}</p>
                  <p className="text-xs text-[#5b403e]">Lihat profil →</p>
                </div>
              </Link>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className={`flex-1 h-11 rounded-[4px] text-sm font-medium ${inCart ? 'border-green-500 text-green-700 bg-green-50' : 'border-[#e5e2e1] text-[#1c1b1b]'}`}
                  onClick={handleCartToggle}
                >
                  {inCart ? <><Check className="w-4 h-4 mr-1.5" /> Ditambahkan</> : <><ShoppingCart className="w-4 h-4 mr-1.5" /> Masukan Keranjang</>}
                </Button>
                <Button
                  className="flex-1 h-11 bg-[#b51822] hover:bg-[#90121a] text-white font-semibold rounded-[4px] text-sm"
                  onClick={handleOrderNow}
                >
                  <Zap className="w-4 h-4 mr-1.5" />
                  Pesan Sekarang
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Section: Specs, Description & Details */}
          <div className="border-t border-[#e5e2e1] p-4">
            {/* Informasi Layanan (spesifikasi lengkap dari database) */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#1c1b1b] mb-2">Informasi Layanan</h3>
              <div className="divide-y divide-[#f0eded] text-sm">
                <div className="flex py-2">
                  <span className="w-40 flex-shrink-0 text-[#5b403e]">Kategori</span>
                  <span className="text-[#1c1b1b]">{service.category_name}</span>
                </div>
                <div className="flex py-2">
                  <span className="w-40 flex-shrink-0 text-[#5b403e]">Estimasi Waktu Kerja</span>
                  <span className="text-[#1c1b1b]">{service.estimated_duration} menit</span>
                </div>
                <div className="flex py-2">
                  <span className="w-40 flex-shrink-0 text-[#5b403e]">Harga</span>
                  <span className="text-[#1c1b1b]">Rp {service.price.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex py-2">
                  <span className="w-40 flex-shrink-0 text-[#5b403e]">Mitra</span>
                  <Link href={`/${service.partner_username}`} className="text-[#b51822] hover:underline">
                    {service.partner_name}
                  </Link>
                </div>
                <div className="flex py-2">
                  <span className="w-40 flex-shrink-0 text-[#5b403e]">Rating Mitra</span>
                  <span className="text-[#1c1b1b]">
                    {(service.partner_avg_rating ?? 0).toFixed(1)} ({service.partner_total_reviews} ulasan)
                  </span>
                </div>
                <div className="flex py-2">
                  <span className="w-40 flex-shrink-0 text-[#5b403e]">Jumlah Foto</span>
                  <span className="text-[#1c1b1b]">{allPhotos.length}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {service.description && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-[#1c1b1b] mb-2">Deskripsi Layanan</h3>
                <p className="text-sm text-[#5b403e] whitespace-pre-line leading-relaxed">
                  {service.description}
                </p>
              </div>
            )}

            {/* Included / Excluded */}
            {(includedItems.length > 0 || excludedItems.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {includedItems.length > 0 && (
                  <div className="p-3 bg-green-50 rounded-[4px]">
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
                  <div className="p-3 bg-red-50 rounded-[4px]">
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
      </div>

      {/* Mobile Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e5e2e1]">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button
            variant="outline"
            className={`flex-shrink-0 h-10 w-10 p-0 rounded-[4px] ${inCart ? 'border-green-500 text-green-600 bg-green-50' : 'border-[#e5e2e1] text-[#1c1b1b]'}`}
            onClick={handleCartToggle}
          >
            {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          </Button>
          <div className="flex-1">
            <p className="text-base font-bold text-[#b51822]">Rp {service.price.toLocaleString('id-ID')}</p>
          </div>
          <Button className="h-10 px-5 bg-[#b51822] hover:bg-[#90121a] text-white font-bold rounded-[4px] text-sm" onClick={handleOrderNow}>
            <Zap className="w-3.5 h-3.5 mr-1.5" /> Pesan
          </Button>
        </div>
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowSchedule(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-[12px] sm:rounded-[8px] max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#e5e2e1] px-4 py-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1c1b1b]">Jadwal {service.partner_name}</h2>
              <button onClick={() => setShowSchedule(false)} className="p-1 hover:bg-[#f0eded] rounded-full">
                <X className="w-5 h-5 text-[#5b403e]" />
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
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setShowGallery(false)}>
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
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {currentPhotoIndex + 1}/{allPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServiceDetailClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#e5e2e1] border-t-[#b51822] rounded-full animate-spin" />
      </div>
    }>
      <DetailContent />
    </Suspense>
  );
}
