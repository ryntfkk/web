'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Star,
  ShoppingCart,
  Check,
  Zap,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServiceDetail, usePartnerWorkingHours } from '@/hooks/useServiceDetail';
import { useCartStore } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';
import ScheduleView from '@/components/service/ScheduleView';
import { useState } from 'react';

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';

function DetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('id') || '';
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const { addItem, removeItem, isInCart } = useCartStore();

  const {
    data: service,
    isLoading,
    isError,
    refetch,
  } = useServiceDetail(serviceId);

  const { data: workingHours, isLoading: hoursLoading } =
    usePartnerWorkingHours(service?.partner_id);

  const inCart = service ? isInCart(service.id) : false;

  const handleCartToggle = () => {
    if (!isAuthenticated) {
      router.push('/login');
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
      router.push('/login');
      return;
    }
    if (!service) return;
    router.push(`/book/${service.partner_username}?service_id=${service.id}`);
  };

  const nextPhoto = () => {
    if (service && service.photos.length > 1) {
      setCurrentPhotoIndex((prev) =>
        prev === service.photos.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevPhoto = () => {
    if (service && service.photos.length > 1) {
      setCurrentPhotoIndex((prev) =>
        prev === 0 ? service.photos.length - 1 : prev - 1
      );
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
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3">
          <div className="w-full aspect-[16/9] bg-[#e5e2e1] rounded-[4px] animate-pulse mb-3" />
          <div className="space-y-2">
            <div className="h-6 bg-[#e5e2e1] rounded-[4px] animate-pulse w-3/4" />
            <div className="h-4 bg-[#e5e2e1] rounded-[4px] animate-pulse w-1/2" />
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
  const hasMultiplePhotos = service.photos && service.photos.length > 1;

  return (
    <div className="min-h-screen bg-[#fcf9f8] pb-20 sm:pb-4">
      {/* Mobile Header */}
      <div className="sm:hidden sticky top-0 z-30 bg-white border-b border-[#e5e2e1] px-3 py-2.5 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-1.5 -ml-1.5 hover:bg-[#f0eded] rounded-full">
          <ArrowLeft className="w-4 h-4 text-[#1c1b1b]" />
        </button>
        <h1 className="text-sm font-semibold text-[#1c1b1b] truncate mx-2">Detail Layanan</h1>
        <div className="w-8" />
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3">
        {/* Photo Gallery */}
        <div className="relative mb-4">
          <div
            className="relative w-full aspect-[16/9] bg-[#e5e2e1] rounded-[4px] overflow-hidden cursor-pointer"
            onClick={() => hasMultiplePhotos && setShowGallery(true)}
          >
            <Image
              src={hasMultiplePhotos ? service.photos[currentPhotoIndex].photo_url : mainPhoto}
              alt={service.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 896px"
              priority
            />

            {hasMultiplePhotos && (
              <>
                <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                  className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full items-center justify-center shadow">
                  <ChevronLeft className="w-4 h-4 text-[#1c1b1b]" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                  className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full items-center justify-center shadow">
                  <ChevronRight className="w-4 h-4 text-[#1c1b1b]" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {service.photos.map((_, idx) => (
                    <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(idx); }}
                      className={`h-1.5 rounded-full transition-all ${idx === currentPhotoIndex ? 'bg-white w-3' : 'bg-white/50 w-1.5'}`} />
                  ))}
                </div>
              </>
            )}
          </div>

          {hasMultiplePhotos && (
            <div className="hidden sm:flex gap-1.5 mt-2">
              {service.photos.map((photo, idx) => (
                <button key={photo.id} onClick={() => setCurrentPhotoIndex(idx)}
                  className={`relative flex-shrink-0 w-16 h-11 rounded-[4px] overflow-hidden transition-all ${idx === currentPhotoIndex ? 'ring-2 ring-[#b51822] ring-offset-1' : 'opacity-50 hover:opacity-80'}`}>
                  <Image src={photo.photo_url} alt={`Foto ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Info */}
        <div className="space-y-3">
          {/* Category & Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#5b403e]">
              <span className="inline-flex text-xs font-medium text-[#5b403e] bg-[#f0eded] rounded-full px-2.5 py-0.5">
                {service.category_name}
              </span>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-[#D69E2E] text-[#D69E2E]" />
                <span className="font-semibold text-[#1c1b1b]">{service.partner_avg_rating.toFixed(1)}</span>
                <span>({service.partner_total_reviews} ulasan)</span>
              </div>
            </div>
            {/* Mobile Price */}
            <p className="sm:hidden text-xl font-bold text-[#b51822] whitespace-nowrap">
              Rp {service.price.toLocaleString('id-ID')}
            </p>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-[#1c1b1b] leading-tight">
            {service.name}
          </h1>

          {/* Meta Row */}
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#5b403e]">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{service.estimated_duration} menit</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{service.category_name}</span>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="flex flex-wrap gap-2">
            {/* Schedule Button */}
            <button
              onClick={() => setShowSchedule(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-[#5b403e] bg-white border border-[#e5e2e1] rounded-[4px] hover:bg-[#f0eded] hover:border-[#b51822] transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              Lihat Jadwal Mitra
            </button>
          </div>

          {/* Partner Card */}
          <Link
            href={`/${service.partner_username}`}
            className="flex items-center gap-3 p-3 bg-white border border-[#e5e2e1] rounded-[4px] hover:border-[#b51822] transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#f0eded] overflow-hidden flex-shrink-0">
              {service.partner_avatar_url ? (
                <Image src={service.partner_avatar_url} alt={service.partner_name} width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-[#5b403e]">
                  {service.partner_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1c1b1b]">{service.partner_name}</p>
              <p className="text-xs text-[#5b403e]">Lihat profil mitra →</p>
            </div>
          </Link>

          {/* Description */}
          {service.description && (
            <div className="bg-white rounded-[4px] border border-[#e5e2e1] p-3.5">
              <h3 className="text-sm font-semibold text-[#1c1b1b] mb-2">Deskripsi</h3>
              <p className="text-xs sm:text-sm text-[#5b403e] whitespace-pre-line leading-relaxed">
                {service.description}
              </p>
            </div>
          )}

          {/* Included / Excluded */}
          {(service.included_items.length > 0 || service.excluded_items.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {service.included_items.length > 0 && (
                <div className="bg-white rounded-[4px] border border-[#e5e2e1] p-3">
                  <h3 className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Termasuk
                  </h3>
                  <ul className="space-y-1">
                    {service.included_items.map((item, i) => (
                      <li key={i} className="text-xs text-[#5b403e]">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {service.excluded_items.length > 0 && (
                <div className="bg-white rounded-[4px] border border-[#e5e2e1] p-3">
                  <h3 className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> Tidak Termasuk
                  </h3>
                  <ul className="space-y-1">
                    {service.excluded_items.map((item, i) => (
                      <li key={i} className="text-xs text-[#5b403e]">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Price & Actions */}
        <div className="hidden sm:block mt-4 bg-white rounded-[4px] border border-[#e5e2e1] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#5b403e]">Harga</p>
              <p className="text-2xl font-bold text-[#b51822]">
                Rp {service.price.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className={`h-10 px-4 rounded-[4px] text-sm ${inCart ? 'border-green-500 text-green-700 bg-green-50' : 'border-[#e5e2e1] text-[#1c1b1b]'}`}
                onClick={handleCartToggle}
              >
                {inCart ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Ditambahkan</> : <><ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> Keranjang</>}
              </Button>
              <Button className="h-10 px-5 bg-[#b51822] hover:bg-[#90121a] text-white font-bold rounded-[4px] text-sm" onClick={handleOrderNow}>
                <Zap className="w-3.5 h-3.5 mr-1.5" /> Pesan Sekarang
              </Button>
            </div>
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
                <svg className="w-5 h-5 text-[#5b403e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setShowGallery(false)}>
          <button onClick={() => setShowGallery(false)} className="absolute top-3 right-3 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="relative w-full max-w-3xl aspect-[4/3] mx-4" onClick={e => e.stopPropagation()}>
            <Image src={service.photos[currentPhotoIndex].photo_url} alt={`Foto ${currentPhotoIndex + 1}`} fill className="object-contain" sizes="100vw" />
          </div>
          <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {service.photos.map((_, idx) => (
              <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(idx); }}
                className={`w-2 h-2 rounded-full transition-all ${idx === currentPhotoIndex ? 'bg-white' : 'bg-white/40'}`} />
            ))}
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
