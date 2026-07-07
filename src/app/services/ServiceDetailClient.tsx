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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServiceDetail, usePartnerWorkingHours } from '@/hooks/useServiceDetail';
import { useCartStore } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';
import ScheduleView from '@/components/service/ScheduleView';

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';

function DetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('id') || '';

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

  // ── No ID provided ───────────────────────────────────────────────
  if (!serviceId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-sm text-[#5b403e]">Layanan tidak ditentukan.</p>
        <Link
          href="/"
          className="text-[13px] text-[#b51822] hover:underline"
        >
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-[300px] bg-gray-200 rounded-[4px]" />
        <div className="h-8 bg-gray-200 rounded-[4px] w-3/4" />
        <div className="h-6 bg-gray-200 rounded-[4px] w-1/2" />
        <div className="h-24 bg-gray-200 rounded-[4px]" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────
  if (isError || !service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-sm text-red-500">
          {isError
            ? 'Gagal memuat detail layanan.'
            : 'Layanan tidak ditemukan.'}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="text-[12px] sm:text-[13px] h-auto py-1.5 px-4"
        >
          Coba Lagi
        </Button>
        <Link
          href="/"
          className="text-[13px] text-[#b51822] hover:underline"
        >
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  // ── Normal ───────────────────────────────────────────────────────
  const mainPhoto = service.photo_url || PLACEHOLDER_IMG;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-[13px] sm:text-[14px] text-[#5b403e] hover:text-[#b51822] w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      {/* ── Photo Gallery ──────────────────────────────────────── */}
      {service.photos.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {service.photos.map((photo, i) => (
            <div
              key={photo.id}
              className="relative flex-shrink-0 w-[280px] sm:w-[400px] md:w-[560px] h-[200px] sm:h-[280px] md:h-[360px] bg-[#e5e2e1] rounded-[4px] overflow-hidden"
            >
              <Image
                src={photo.photo_url}
                alt={`${service.name} - Foto ${i + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 280px, (max-width: 1024px) 400px, 560px"
                priority={i === 0}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative w-full h-[200px] sm:h-[280px] md:h-[360px] bg-[#e5e2e1] rounded-[4px] overflow-hidden">
          <Image
            src={mainPhoto}
            alt={service.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </div>
      )}

      {/* ── Service Info ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <span className="inline-flex self-start text-[11px] sm:text-[12px] font-medium text-[#5b403e] bg-[#f0eded] rounded-full px-3 py-1">
          {service.category_name}
        </span>

        <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-bold text-[#1c1b1b] leading-tight">
          {service.name}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-[13px] sm:text-[14px] text-[#5b403e]">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-[#D69E2E] text-[#D69E2E]" />
            <span className="font-semibold text-[#1c1b1b]">
              {service.partner_avg_rating.toFixed(1)}
            </span>
            <span>({service.partner_total_reviews} ulasan)</span>
          </div>
          <span>·</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{service.estimated_duration} menit</span>
          </div>
        </div>

        <p className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-[#b51822]">
          Rp {service.price.toLocaleString('id-ID')}
        </p>

        {/* Partner card */}
        <Link
          href={`/${service.partner_username}`}
          className="flex items-center gap-3 p-3 border border-[#e5e2e1] rounded-[4px] hover:border-[#b51822] hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#e5e2e1] overflow-hidden flex-shrink-0">
            {service.partner_avatar_url ? (
              <Image
                src={service.partner_avatar_url}
                alt={service.partner_name}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[16px] font-semibold text-[#5b403e]">
                {service.partner_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-[14px] sm:text-[15px] font-semibold text-[#1c1b1b]">
              {service.partner_name}
            </p>
            <p className="text-[12px] sm:text-[13px] text-[#5b403e]">
              Lihat profil mitra &rarr;
            </p>
          </div>
        </Link>
      </div>

      {/* ── Description ────────────────────────────────────────── */}
      {service.description && (
        <div className="rounded-[4px] border border-[#e5e2e1] bg-white p-4">
          <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#1c1b1b] mb-2">
            Deskripsi
          </h3>
          <p className="text-[13px] sm:text-[14px] text-[#5b403e] whitespace-pre-line leading-relaxed">
            {service.description}
          </p>
        </div>
      )}

      {/* ── Included / Excluded ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {service.included_items.length > 0 && (
          <div className="rounded-[4px] border border-[#e5e2e1] bg-white p-4">
            <h3 className="text-[13px] sm:text-[14px] font-semibold text-green-700 mb-2 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Termasuk
            </h3>
            <ul className="space-y-1">
              {service.included_items.map((item, i) => (
                <li
                  key={i}
                  className="text-[12px] sm:text-[13px] text-[#5b403e] flex items-start gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {service.excluded_items.length > 0 && (
          <div className="rounded-[4px] border border-[#e5e2e1] bg-white p-4">
            <h3 className="text-[13px] sm:text-[14px] font-semibold text-red-600 mb-2 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Tidak Termasuk
            </h3>
            <ul className="space-y-1">
              {service.excluded_items.map((item, i) => (
                <li
                  key={i}
                  className="text-[12px] sm:text-[13px] text-[#5b403e] flex items-start gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Schedule ───────────────────────────────────────────── */}
      <ScheduleView workingHours={workingHours} isLoading={hoursLoading} />

      {/* ── Action Bar (sticky bottom) ─────────────────────────── */}
      <div className="sticky bottom-0 z-40 -mx-3 sm:-mx-4 px-3 sm:px-4 py-3 bg-white border-t border-[#e5e2e1] flex items-center gap-2 sm:gap-3 mt-2">
        <Button
          variant="outline"
          className={
            inCart
              ? 'flex-1 sm:flex-none text-[13px] sm:text-[14px] h-[44px] border-green-500 text-green-700 hover:bg-green-50'
              : 'flex-1 sm:flex-none text-[13px] sm:text-[14px] h-[44px] border-[#e5e2e1] text-[#1c1b1b] hover:bg-[#f7f5f4]'
          }
          onClick={handleCartToggle}
        >
          {inCart ? (
            <>
              <Check className="w-4 h-4 mr-1.5" />
              Di Keranjang
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              Keranjang
            </>
          )}
        </Button>

        <Button
          className="flex-1 text-[13px] sm:text-[14px] h-[44px] bg-[#b51822] hover:bg-[#90121a] text-white font-bold"
          onClick={handleOrderNow}
        >
          <Zap className="w-4 h-4 mr-1.5" />
          Pesan Sekarang
        </Button>

        <Button
          variant="ghost"
          className="flex-shrink-0 text-[#5b403e] hover:text-[#b51822] h-[44px] w-[44px] p-0"
          title="Chat mitra"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

export default function ServiceDetailClient() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-[#e5e2e1] border-t-[#b51822] rounded-full animate-spin" />
        </div>
      }
    >
      <DetailContent />
    </Suspense>
  );
}
