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
import { Modal } from '@/components/ui/modal';
import { fetchAPI } from '@/lib/api';
import { formatRupiah } from '@/lib/format';
import { useServiceDetail, usePartnerWorkingHours, useServiceReviews } from '@/hooks/useServiceDetail';
import ReviewSection from '@/components/partner/ReviewSection';
import { useFavoriteServices, useFavoritesActions } from '@/hooks/useFavorites';
import { useCartStore } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useChatUiStore } from '@/lib/store/chatUiStore';
import { useRecentlyViewedStore } from '@/lib/store/recentlyViewedStore';
import ReportDialog from '@/components/ReportDialog';
import ScheduleView from '@/components/service/ScheduleView';
import MoreFromPartner from '@/components/service/MoreFromPartner';
import SimilarServices from '@/components/service/SimilarServices';
import { PLACEHOLDER_SERVICE } from '@/lib/images';
import { unitLabel } from '@/lib/order-utils';
import { formatDistanceMeters } from '@/lib/distance';




function DetailContent({ serviceId: serviceIdProp, categorySlug, localLandingHref }: { serviceId?: string; categorySlug?: string; localLandingHref?: string }) {
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
  // Modal pilihan variasi (Shopee-style). Saat user klik "Pesan"/"Keranjang"
  // tanpa memilih variasi wajib, modal muncul; setelah variasi dipilih, aksi
  // pending dijalankan otomatis.
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  // 'order' | 'cart' . aksi yang ditunda hingga variasi dipilih dari modal.
  const [pendingAction, setPendingAction] = useState<'order' | 'cart' | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Halaman ini publik . auth hanya dicek saat user melakukan aksi
  // (tambah keranjang / pesan), bukan saat melihat halaman.
  const { isAuthenticated } = useAuthStore();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { addItem, removeItem, isInCart } = useCartStore();

  const { data: service, isLoading, isError, refetch } = useServiceDetail(serviceId);
  const { data: workingHours, isLoading: hoursLoading } = usePartnerWorkingHours(service?.partner_id);
  const { data: serviceReviews, isLoading: reviewsLoading } = useServiceReviews(serviceId);

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
      partner_name: service.partner_name,
      partner_avatar_url: service.partner_avatar_url,
      partner_avg_rating: service.partner_avg_rating,
      partner_city: service.partner_city,
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
        // Buka modal pilihan variasi, tunda aksi "tambah keranjang".
        setPendingAction('cart');
        setVariationModalOpen(true);
        return;
      }
      addItem({
        service_id: service.id,
        partner_id: service.partner_id,
        partner_username: service.partner_username,
        // Penerima pembayaran ikut disimpan agar keranjang & checkout bisa
        // menyebutkannya tanpa memanggil profil mitra lagi (F-15).
        partner_name: service.partner_name,
        partner_legal_name: service.partner_legal_name,
        partner_type: service.partner_type,
        service_name: service.name,
        price: vars.find((x) => x.id === selectedVariationId)?.price ?? service.price,
        photo_url: service.photo_url || PLACEHOLDER_SERVICE,
        // Dibawa ke keranjang supaya stepper di sana tahu batas bawahnya dan
        // subtotalnya sama dengan yang akan ditagih (audit E4).
        min_order: service.min_order ?? 1,
        quantity: service.min_order ?? 1,
        variation_id: vars.find((x) => x.id === selectedVariationId)?.id,
        variation_name: vars.find((x) => x.id === selectedVariationId)?.name,
      });
      const v = vars.find((x) => x.id === selectedVariationId);
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
      // Buka modal pilihan variasi, tunda aksi "pesan sekarang".
      setPendingAction('order');
      setVariationModalOpen(true);
      return;
    }
    const q = selectedVariationId ? `&variation_id=${selectedVariationId}` : '';
    router.push(`/book/${service.partner_username}?service_id=${service.id}${q}`);
  };

  // Pilih variasi dari modal → jalankan aksi pending (order/cart) otomatis.
  const handleVariationPick = (variationId: string) => {
    setSelectedVariationId(variationId);
    setVariationModalOpen(false);
    const action = pendingAction;
    setPendingAction(null);
    // Tunda sedikit agar state ter-update sebelum aksi baca selectedVariationId.
    if (action === 'order') {
      const q = variationId ? `&variation_id=${variationId}` : '';
      router.push(`/book/${service!.partner_username}?service_id=${service!.id}${q}`);
    } else if (action === 'cart' && service) {
      const v = service.variations?.find((x) => x.id === variationId);
      addItem({
        service_id: service.id,
        partner_id: service.partner_id,
        partner_username: service.partner_username,
        // Penerima pembayaran ikut disimpan agar keranjang & checkout bisa
        // menyebutkannya tanpa memanggil profil mitra lagi (F-15).
        partner_name: service.partner_name,
        partner_legal_name: service.partner_legal_name,
        partner_type: service.partner_type,
        service_name: service.name,
        price: v?.price ?? service.price,
        photo_url: service.photo_url || PLACEHOLDER_SERVICE,
        // Dibawa ke keranjang supaya stepper di sana tahu batas bawahnya dan
        // subtotalnya sama dengan yang akan ditagih (audit E4).
        min_order: service.min_order ?? 1,
        quantity: service.min_order ?? 1,
        variation_id: v?.id,
        variation_name: v?.name,
      });
      showToast(v ? `${service.name} (${v.name}) masuk keranjang` : `${service.name} masuk keranjang`, 'success');
    }
  };

  // Chat langsung dengan mitra dari halaman detail (pola sama dengan ProfileHeader).
  const [chatBusy, setChatBusy] = useState(false);
  const openPanel = useChatUiStore((s) => s.openPanel);
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
        body: JSON.stringify({ partner_id: service.partner_user_id }),
      });
      if (res.success && res.data?.room_id) {
        if (window.matchMedia('(min-width: 1024px)').matches) {
          openPanel(res.data.room_id);
        } else {
          router.push(`/chat/${res.data.room_id}`);
        }
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
  // Persyaratan yang harus disiapkan pelanggan. Backend mengembalikan label yang
  // sudah ter-resolve (katalog atau teks bebas mitra), jadi tidak perlu lookup.
  const requirements: Array<{
    code?: string;
    label: string;
    hint?: string;
    note?: string;
    is_mandatory: boolean;
  }> = service.requirements ?? [];

  // Variasi (Shopee-style). Harga besar mengikuti variasi terpilih; sebelum
  // memilih, tampilkan harga termurah (= service.price dari backend).
  const serviceSummary = serviceReviews?.summary;
  const hasServiceReviews = (serviceSummary?.total_reviews ?? 0) > 0;

  // Mitra yang membuka layanannya sendiri tidak boleh melaporkan diri sendiri
  // (pola sama dengan `isOwnProfile` di ProfileHeader).
  const isOwnService = !!currentUserId && currentUserId === service.partner_user_id;

  const variations = service.variations ?? [];
  const hasVariations = variations.length > 0;
  const selectedVariation = variations.find((v) => v.id === selectedVariationId) ?? null;
  const displayPrice = selectedVariation?.price ?? service.price;
  const minOrder = service.min_order ?? 1;

  return (
    <div className="page-h bg-brand-gray-60 pb-20 sm:pb-4">
      <div className="max-w-6xl mx-auto px-0 sm:px-4 py-0 sm:py-3">
        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-brand-gray-700 mb-3 px-4 py-2 flex-wrap">
          <Link href="/" className="hover:text-brand-red">Beranda</Link>
          <span>/</span>
          {categorySlug && service.category_name ? (
            <Link href={`/kategori/${categorySlug}`} className="hover:text-brand-red">{service.category_name}</Link>
          ) : (
            <span>{service.category_name}</span>
          )}
          <span>/</span>
          <Link href="/services" className="hover:text-brand-red">Layanan</Link>
          <span>/</span>
          <span className="text-brand-gray-900">{service.name}</span>
        </div>

        {/* Main Content - Shopee Style */}
        <div className="bg-white sm:rounded-md sm:shadow-sm">
          <div className="flex flex-col md:flex-row">
            {/* Left: Images */}
            <div className="w-full md:w-[42%] p-3 sm:p-4">
              {/* Main Image . swipeable carousel (all photos) */}
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
                        alt={`Jasa ${service.category_name}${service.partner_city ? ` di ${service.partner_city}` : ''} - ${service.name} oleh ${service.partner_name} - foto ${idx + 1}`}
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
                    <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} aria-label="Foto sebelumnya"
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                      <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} aria-label="Foto berikutnya"
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
                      <Image src={photo.photo_url} alt={`Thumbnail jasa ${service.category_name} - ${service.name} foto ${idx + 1}`} fill className="object-cover" sizes="64px" />
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
                  className={`flex items-center gap-1 text-xs hover:text-brand-red disabled:opacity-50 ${isFav ? 'text-brand-red' : 'text-brand-gray-700'
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
                    <span className="font-semibold text-brand-gray-900">
                      {(hasServiceReviews ? serviceSummary!.avg_rating : service.partner_avg_rating ?? 0).toFixed(1)}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-brand-gray-100" />
                  {/* Lingkup angka harus jelas: "12 Ulasan" tepat di bawah nama
                      layanan terbaca sebagai ulasan LAYANAN INI, padahal dulu
                      isinya ulasan seluruh layanan mitra. */}
                  <a href="#ulasan" className="text-sm text-brand-gray-700 hover:text-brand-red underline-offset-2 hover:underline">
                    {hasServiceReviews
                      ? `${serviceSummary!.total_reviews} ulasan layanan ini`
                      : `${service.partner_total_reviews} ulasan mitra`}
                  </a>
                  <div className="w-px h-4 bg-brand-gray-100" />
                  <span className="flex items-center gap-1 text-sm text-brand-gray-700">
                    <Clock className="w-3.5 h-3.5" />
                    Estimasi {service.estimated_duration} menit
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={handleFavToggle}
                    disabled={favBusy}
                    aria-label={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
                    className={`p-1.5 rounded-full transition-colors disabled:opacity-50 ${isFav
                        ? 'text-brand-red bg-brand-red-light'
                        : 'text-brand-gray-700 hover:text-brand-red hover:bg-brand-red-light'
                      }`}
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    aria-label="Bagikan layanan"
                    className="p-1.5 hover:bg-brand-red-light rounded-full text-brand-gray-700 hover:text-brand-red transition-colors"
                  >
                    {shareCopied ? <Check className="w-4 h-4 text-brand-success" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>
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
                          className={`px-3 py-2 rounded-md border text-sm text-left transition-colors ${active
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

              {/* Penanda persyaratan wajib . di dekat harga, bukan hanya di kaki
                  halaman. Persyaratan yang baru terlihat setelah menggulir penuh
                  tidak memenuhi fungsinya (C3). */}
              {requirements.some((r) => r.is_mandatory) && (
                <a
                  href="#persyaratan"
                  className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-warning-border bg-brand-warning-soft px-3 py-1.5 text-left hover:border-brand-warning-dark transition-colors"
                >
                  <span className="text-[11px] font-semibold text-brand-warning-dark shrink-0">Perlu disiapkan</span>
                  <span className="text-[11px] text-brand-gray-700">
                    {requirements.filter((r) => r.is_mandatory).length} hal wajib · lihat
                  </span>
                </a>
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
                    {/* Untuk mitra badan usaha, nama merek bukan penerima uang.
                        Pelanggan berhak tahu badan hukum mana yang menerima
                        pembayarannya SEBELUM memesan . detail pesanan sudah
                        menampilkannya, halaman produk dulu belum. */}
                    {service.partner_type === 'vendor' &&
                      service.partner_legal_name &&
                      service.partner_legal_name !== service.partner_name && (
                        <p className="text-xs text-brand-gray-450 truncate mt-0.5">
                          Pembayaran diterima oleh {service.partner_legal_name}
                        </p>
                      )}
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
                  <span className="text-brand-gray-900">
                    {service.category_name}
                    {localLandingHref && service.partner_city && (
                      <>
                        {' · '}
                        <Link href={localLandingHref} className="text-brand-red hover:underline">
                          {service.partner_city}
                        </Link>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex py-2">
                  <span className="w-40 flex-shrink-0 text-brand-gray-700">Estimasi Waktu Kerja</span>
                  <span className="text-brand-gray-900">{service.estimated_duration} menit</span>
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
                {/* Baris "Jumlah Foto" DIHAPUS (audit E12): metadata internal
                    yang tidak memengaruhi keputusan membeli, dan jumlahnya toh
                    sudah terlihat dari carousel + thumbnail di atas. */}
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
              <div className="mb-5 border border-brand-gray-100 rounded-xl overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-brand-gray-100">
                  {includedItems.length > 0 && (
                    <div className="p-4 bg-white">
                      <h4 className="text-[13px] font-bold text-brand-gray-900 mb-3 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-brand-success" />
                        Yang Termasuk
                      </h4>
                      <ul className="space-y-2.5">
                        {includedItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px] text-brand-gray-700 leading-relaxed">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-gray-300 mt-1.5 flex-shrink-0" />
                            <span className="whitespace-pre-line">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {excludedItems.length > 0 && (
                    <div className="p-4 bg-brand-gray-50/50">
                      <h4 className="text-[13px] font-bold text-brand-gray-900 mb-3 flex items-center gap-1.5">
                        <X className="w-4 h-4 text-brand-gray-400" />
                        Tidak Termasuk
                      </h4>
                      <ul className="space-y-2.5">
                        {excludedItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px] text-brand-gray-700 leading-relaxed">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-gray-300 mt-1.5 flex-shrink-0" />
                            <span className="whitespace-pre-line">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Persyaratan pelanggan (R2 §8.3). Ditempatkan SEBELUM FAQ karena
                ini bukan informasi tambahan . pelanggan harus tahu apa yang
                harus ia sediakan sebelum memutuskan memesan. */}
            <div id="persyaratan" className="scroll-mt-20" />
            {requirements.length === 0 ? (
              /* Blok ini SELALU tampil, termasuk saat kosong (C3). Menyembunyikannya
                 membuat "tidak ada persyaratan khusus" tidak bisa dibedakan dari
                 "gagal dimuat" . pelanggan tak punya cara tahu mana yang terjadi. */
              <div className="mt-4 border-t border-brand-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-brand-gray-900 mb-1">
                  Yang Perlu Kamu Siapkan
                </h3>
                <p className="text-xs text-brand-gray-450">
                  Tidak ada persyaratan khusus untuk layanan ini.
                </p>
              </div>
            ) : (
              <div className="mt-4 border-t border-brand-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-brand-gray-900 mb-1">
                  Yang Perlu Kamu Siapkan
                </h3>
                <p className="text-xs text-brand-gray-450 mb-3">
                  Mitra membutuhkan hal berikut agar pekerjaan bisa dilakukan.
                </p>
                <ul className="space-y-2">
                  {requirements.map((r, i) => (
                    <li
                      key={r.code || `custom-${i}`}
                      className="flex items-start gap-2 rounded-md border border-brand-gray-100 p-2.5"
                    >
                      <span
                        className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${r.is_mandatory
                            ? 'bg-brand-warning-soft text-brand-warning-dark border border-brand-warning-border'
                            : 'bg-brand-gray-50 text-brand-gray-450'
                          }`}
                      >
                        {r.is_mandatory ? 'Wajib' : 'Disarankan'}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-brand-gray-900">
                          {r.label}
                        </span>
                        {r.hint && (
                          <span className="mt-0.5 block text-xs text-brand-gray-450">{r.hint}</span>
                        )}
                        {r.note && (
                          <span className="mt-0.5 block text-xs text-brand-gray-450">
                            Catatan mitra: {r.note}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Laporkan layanan.
                `/help` secara eksplisit menjanjikan tombol ini . "Buka halaman
                mitra/layanan lalu tekan tombol Laporkan" . dan `ReportDialog`
                sudah mendukung `targetType="service"` sejak lahir, tapi tidak
                pernah dipasang di sini. Pelanggan yang mengikuti petunjuk
                halaman bantuan mencari tombol yang tidak ada (audit E10). */}
            {!isOwnService && (
              <div className="mt-4 border-t border-brand-gray-100 pt-4 flex justify-end">
                <ReportDialog targetType="service" targetId={service.id} />
              </div>
            )}

            {/* FAQs */}
            {service.faqs && service.faqs.length > 0 && (
              <div className="mt-4 border-t border-brand-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-brand-gray-900 mb-3">Pertanyaan Umum (FAQ)</h3>
                <div className="space-y-2">
                  {service.faqs.map((faq, i) => (
                    <details key={i} className="group bg-brand-gray-25 rounded-md border border-brand-gray-100">
                      <summary className="flex items-center justify-between cursor-pointer p-3 text-sm font-medium text-brand-gray-900">
                        {faq.question}
                        <span className="ml-2 transform transition-transform group-open:rotate-180">
                          ▼
                        </span>
                      </summary>
                      <div className="p-3 pt-0 text-sm text-brand-gray-700 whitespace-pre-line border-t border-brand-gray-100 mt-2">
                        <div className="pt-2">{faq.answer}</div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ulasan LAYANAN INI (C2). Sebelumnya halaman produk sama sekali tidak
            punya isi ulasan . pelanggan harus pergi ke profil mitra tepat saat
            sedang memutuskan membeli. */}
        <div id="ulasan" className="mt-4 scroll-mt-20">
          {reviewsLoading ? (
            <div className="bg-white rounded p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
              <div className="h-6 w-40 bg-brand-gray-100 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                <div className="h-16 bg-brand-gray-100 rounded animate-pulse" />
                <div className="h-16 bg-brand-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ) : (
            <ReviewSection
              reviews={serviceReviews?.reviews || []}
              summary={
                serviceSummary || {
                  total_reviews: 0,
                  avg_rating: 0,
                  count_5: 0,
                  count_4: 0,
                  count_3: 0,
                  count_2: 0,
                  count_1: 0,
                }
              }
              title="Ulasan Layanan Ini"
              emptyText={
                service.partner_total_reviews > 0
                  ? `Belum ada ulasan untuk layanan ini. Mitra ini punya ${service.partner_total_reviews} ulasan dari layanan lainnya.`
                  : 'Belum ada ulasan untuk layanan ini.'
              }
              footer={
                service.partner_total_reviews > 0 ? (
                  <Link
                    href={`/${service.partner_username}`}
                    className="text-sm font-medium text-brand-red hover:underline"
                  >
                    Lihat semua ulasan {service.partner_name}
                  </Link>
                ) : null
              }
            />
          )}
        </div>

        {/* Cross-sell: layanan lain dari mitra yang sama */}
        <MoreFromPartner username={service.partner_username} excludeId={service.id} />

        {/* Rekomendasi: layanan serupa dari mitra lain (kategori sama) */}
        <SimilarServices
          categoryId={service.category_id}
          excludeServiceId={service.id}
          excludePartnerId={service.partner_id}
          categoryName={service.category_name}
          partnerCity={service.partner_city}
          localLandingHref={localLandingHref}
        />
      </div>

      {/* Mobile Action Bar . sticky bawah (Fase 1); desktop pakai tombol di panel info. */}
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
                overflow-auto), bukan terhadap viewport . top-16 membuat judulnya
                mengambang 64px dari tepi atas modal saat isinya di-scroll. */}
            <div className="sticky top-0 bg-white border-b border-brand-gray-100 px-4 py-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-brand-gray-900">Jadwal {service.partner_name}</h2>
              <button onClick={() => setShowSchedule(false)} aria-label="Tutup jadwal" className="p-1 hover:bg-brand-red-light rounded-full">
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
          <button onClick={() => setShowGallery(false)} aria-label="Tutup galeri" className="absolute top-3 right-3 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white z-10">
            <X className="w-6 h-6" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} aria-label="Foto sebelumnya" className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="relative w-full h-full max-w-3xl max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <Image src={allPhotos[currentPhotoIndex].photo_url} alt={`Jasa ${service.category_name}${service.partner_city ? ` di ${service.partner_city}` : ''} - ${service.name} foto ${currentPhotoIndex + 1}`} fill className="object-contain" sizes="100vw" />
          </div>
          <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} aria-label="Foto berikutnya" className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white">
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

      {/* Variation Picker Modal . muncul saat user klik "Pesan"/"Keranjang"
          tanpa memilih variasi wajib (pola marketplace). Memakai Modal bersama
          (bottom-sheet di mobile, kartu di desktop). */}
      <Modal
        open={variationModalOpen}
        onClose={() => { setVariationModalOpen(false); setPendingAction(null); }}
        title="Pilih Variasi"
        maxWidthClass="sm:max-w-md"
      >
        {hasVariations && (
          <div className="space-y-3">
            <p className="text-sm text-brand-gray-700">
              Pilih variasi untuk melanjutkan {pendingAction === 'order' ? 'pemesanan' : 'menambah ke keranjang'}.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {variations.map((v) => {
                const active = v.id === selectedVariationId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleVariationPick(v.id)}
                    className={`px-3 py-3 rounded-md border text-left transition-colors ${active
                        ? 'border-brand-red bg-brand-red-light text-brand-red'
                        : 'border-brand-gray-100 text-brand-gray-900 hover:border-brand-red/50'
                      }`}
                  >
                    <span className="block font-medium text-sm">{v.name}</span>
                    <span className="block text-xs text-brand-gray-700 mt-0.5">{formatRupiah(v.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// `serviceId` opsional: dipakai route baru /services/[id] (SSR + metadata).
// Bila tidak diberikan, komponen jatuh kembali ke query param ?id= (URL lama
// tetap berfungsi) . lihat DetailContent.
// `categorySlug` & `localLandingHref` dari Server Component (fetch kategori by ID)
// . dipakai untuk link visible ke landing lokal /jasa/[slug]/[kota].
export default function ServiceDetailClient({ serviceId, categorySlug, localLandingHref }: { serviceId?: string; categorySlug?: string; localLandingHref?: string }) {
  return (
    <Suspense fallback={<div className="p-4 text-center">Memuat layanan...</div>}>
      <DetailContent serviceId={serviceId} categorySlug={categorySlug} localLandingHref={localLandingHref} />
    </Suspense>
  );
}