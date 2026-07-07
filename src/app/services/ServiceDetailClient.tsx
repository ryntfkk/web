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
  MessageCircle,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
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
    router.push(
      `/book/${service.partner_username}?service_id=${service.id}`,
    );
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

  // ── No ID provided ───────────────────────────────────────────────
  if (!serviceId) {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <div className="w-20 h-20 rounded-full bg-[#f0eded] flex items-center justify-center">
            <svg className="w-10 h-10 text-[#5b403e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#1c1b1b]">Layanan Tidak Ditemukan</h2>
          <p className="text-sm text-[#5b403e] text-center max-w-sm">
            Parameter layanan tidak valid. Silakan pilih layanan dari katalog kami.
          </p>
          <Button
            onClick={() => router.push('/')}
            className="mt-2 bg-[#b51822] hover:bg-[#90121a] text-white h-11 px-6 rounded-[4px]"
          >
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
        <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          {/* Image skeleton */}
          <div className="w-full aspect-[16/10] bg-[#e5e2e1] rounded-[4px] animate-pulse mb-4" />
          {/* Content skeleton */}
          <div className="space-y-4">
            <div className="h-8 bg-[#e5e2e1] rounded-[4px] animate-pulse w-3/4" />
            <div className="h-6 bg-[#e5e2e1] rounded-[4px] animate-pulse w-1/2" />
            <div className="h-12 bg-[#e5e2e1] rounded-[4px] animate-pulse w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────
  if (isError || !service) {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#1c1b1b]">Gagal Memuat Layanan</h2>
          <p className="text-sm text-[#5b403e] text-center max-w-sm">
            Terjadi kesalahan saat memuat detail layanan. Silakan coba lagi.
          </p>
          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="border-[#e5e2e1] text-[#1c1b1b] hover:bg-[#f0eded] h-11 px-5 rounded-[4px]"
            >
              Coba Lagi
            </Button>
            <Button
              onClick={() => router.push('/')}
              className="bg-[#b51822] hover:bg-[#90121a] text-white h-11 px-5 rounded-[4px]"
            >
              Kembali ke Beranda
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal ───────────────────────────────────────────────────────
  const mainPhoto = service.photo_url || PLACEHOLDER_IMG;
  const hasMultiplePhotos = service.photos && service.photos.length > 1;

  return (
    <div className="min-h-screen bg-[#fcf9f8] pb-24 sm:pb-8">
      {/* Mobile Header */}
      <div className="sm:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#e5e2e1] px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 hover:bg-[#f0eded] rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#1c1b1b]" />
        </button>
        <h1 className="text-sm font-semibold text-[#1c1b1b] truncate mx-3">
          Detail Layanan
        </h1>
        <div className="w-9" />
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* ── Photo Gallery ──────────────────────────────────────── */}
        <div className="relative mb-6">
          {/* Main Photo */}
          <div
            className="relative w-full aspect-[16/10] bg-[#e5e2e1] rounded-[4px] overflow-hidden cursor-pointer"
            onClick={() => hasMultiplePhotos && setShowGallery(true)}
          >
            <Image
              src={
                hasMultiplePhotos
                  ? service.photos[currentPhotoIndex].photo_url
                  : mainPhoto
              }
              alt={service.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px"
              priority
            />

            {/* Navigation Arrows (desktop) */}
            {hasMultiplePhotos && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevPhoto();
                  }}
                  className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full items-center justify-center shadow-lg transition-all"
                >
                  <ChevronLeft className="w-5 h-5 text-[#1c1b1b]" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPhoto();
                  }}
                  className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full items-center justify-center shadow-lg transition-all"
                >
                  <ChevronRight className="w-5 h-5 text-[#1c1b1b]" />
                </button>

                {/* Photo Indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {service.photos.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPhotoIndex(idx);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentPhotoIndex
                          ? 'bg-white w-4'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Strip (desktop) */}
          {hasMultiplePhotos && (
            <div className="hidden sm:flex gap-2 mt-3 overflow-x-auto pb-1">
              {service.photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  onClick={() => setCurrentPhotoIndex(idx)}
                  className={`relative flex-shrink-0 w-20 h-14 rounded-[4px] overflow-hidden transition-all ${
                    idx === currentPhotoIndex
                      ? 'ring-2 ring-[#b51822] ring-offset-2'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={photo.photo_url}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Service Info & Actions Grid (Desktop) ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Category Badge */}
            <span className="inline-flex self-start text-xs font-medium text-[#5b403e] bg-[#f0eded] rounded-full px-3 py-1">
              {service.category_name}
            </span>

            {/* Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-[#1c1b1b] leading-tight mb-2">
                {service.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#5b403e]">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-[#D69E2E] text-[#D69E2E]" />
                  <span className="font-semibold text-[#1c1b1b]">
                    {service.partner_avg_rating.toFixed(1)}
                  </span>
                  <span>({service.partner_total_reviews} ulasan)</span>
                </div>
                <span className="text-[#e5e2e1]">·</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{service.estimated_duration} menit</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="bg-white rounded-[4px] border border-[#e5e2e1] p-4">
              <p className="text-xs text-[#5b403e] mb-1">Harga</p>
              <p className="text-3xl font-bold text-[#b51822]">
                Rp {service.price.toLocaleString('id-ID')}
              </p>
            </div>

            {/* Partner Card */}
            <Link
              href={`/${service.partner_username}`}
              className="flex items-center gap-4 p-4 bg-white border border-[#e5e2e1] rounded-[4px] hover:border-[#b51822] hover:shadow-md transition-all block"
            >
              <div className="w-14 h-14 rounded-full bg-[#f0eded] overflow-hidden flex-shrink-0">
                {service.partner_avatar_url ? (
                  <Image
                    src={service.partner_avatar_url}
                    alt={service.partner_name}
                    width={56}
                    height={56}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-[#5b403e]">
                    {service.partner_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-[#1c1b1b]">
                  {service.partner_name}
                </p>
                <p className="text-sm text-[#5b403e]">
                  Lihat profil mitra →
                </p>
              </div>
            </Link>

            {/* Description */}
            {service.description && (
              <div className="bg-white rounded-[4px] border border-[#e5e2e1] p-5">
                <h3 className="text-base font-semibold text-[#1c1b1b] mb-3">
                  Deskripsi
                </h3>
                <p className="text-sm text-[#5b403e] whitespace-pre-line leading-relaxed">
                  {service.description}
                </p>
              </div>
            )}

            {/* Included / Excluded */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {service.included_items.length > 0 && (
                <div className="bg-white rounded-[4px] border border-[#e5e2e1] p-5">
                  <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Termasuk
                  </h3>
                  <ul className="space-y-2">
                    {service.included_items.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-[#5b403e] flex items-start gap-2"
                      >
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {service.excluded_items.length > 0 && (
                <div className="bg-white rounded-[4px] border border-[#e5e2e1] p-5">
                  <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                    <XCircle className="w-5 h-5" /> Tidak Termasuk
                  </h3>
                  <ul className="space-y-2">
                    {service.excluded_items.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-[#5b403e] flex items-start gap-2"
                      >
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Schedule */}
            <ScheduleView workingHours={workingHours} isLoading={hoursLoading} />
          </div>

          {/* Right Column - Desktop Action Card */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-white rounded-[4px] border border-[#e5e2e1] p-5 shadow-sm">
              <p className="text-3xl font-bold text-[#b51822] mb-1">
                Rp {service.price.toLocaleString('id-ID')}
              </p>
              <p className="text-sm text-[#5b403e] mb-6">
                {service.estimated_duration} menit · {service.category_name}
              </p>

              <div className="space-y-3">
                <Button
                  className="w-full h-12 bg-[#b51822] hover:bg-[#90121a] text-white font-bold rounded-[4px] text-sm"
                  onClick={handleOrderNow}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Pesan Sekarang
                </Button>

                <Button
                  variant="outline"
                  className={`w-full h-12 rounded-[4px] text-sm font-medium transition-all ${
                    inCart
                      ? 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100'
                      : 'border-[#e5e2e1] text-[#1c1b1b] hover:bg-[#f0eded]'
                  }`}
                  onClick={handleCartToggle}
                >
                  {inCart ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Ditambahkan ke Keranjang
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Tambah ke Keranjang
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-6 pt-4 border-t border-[#e5e2e1]">
                <div className="flex items-center gap-2 text-sm text-[#5b403e] mb-3">
                  <MapPin className="w-4 h-4" />
                  Mitra aktif di area Anda
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Sticky Action Bar ─────────────────────────────── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e5e2e1] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="outline"
            className={`flex-shrink-0 h-11 px-4 rounded-[4px] text-sm font-medium transition-all ${
              inCart
                ? 'border-green-500 text-green-700 bg-green-50'
                : 'border-[#e5e2e1] text-[#1c1b1b]'
            }`}
            onClick={handleCartToggle}
          >
            {inCart ? (
              <Check className="w-4 h-4" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
          </Button>

          <Button
            className="flex-1 h-11 bg-[#b51822] hover:bg-[#90121a] text-white font-bold rounded-[4px] text-sm"
            onClick={handleOrderNow}
          >
            <Zap className="w-4 h-4 mr-2" />
            Pesan Sekarang
          </Button>
        </div>
      </div>

      {/* ── Gallery Modal ─────────────────────────────────────────── */}
      {showGallery && hasMultiplePhotos && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setShowGallery(false)}
        >
          <button
            onClick={() => setShowGallery(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              prevPhoto();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div
            className="relative w-full max-w-4xl aspect-[4/3] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={service.photos[currentPhotoIndex].photo_url}
              alt={`${service.name} - Foto ${currentPhotoIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextPhoto();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {service.photos.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhotoIndex(idx);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentPhotoIndex ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServiceDetailClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#e5e2e1] border-t-[#b51822] rounded-full animate-spin" />
        </div>
      }
    >
      <DetailContent />
    </Suspense>
  );
}
