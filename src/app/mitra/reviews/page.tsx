"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { Star, MessageSquare } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getInitial } from '@/lib/utils';
import type { PartnerReview, ReviewSummary } from '@/hooks/usePartnerProfile';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// Batas balas 7 hari sejak ulasan dibuat — ditegakkan backend
// (reviews/service.go: RESPONSE_DEADLINE_PASSED). Dicerminkan di UI agar mitra
// tidak mengetik balasan panjang lalu ditolak.
const RESPONSE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RESPONSE_LENGTH = 1000;

const ASPECT_LABELS: { key: keyof PartnerReview; label: string }[] = [
  { key: 'rating_quality', label: 'Kualitas' },
  { key: 'rating_punctuality', label: 'Ketepatan waktu' },
  { key: 'rating_communication', label: 'Komunikasi' },
];

export default function MitraReviewsPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const { showToast } = useToast();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  // React Query, bukan useEffect+setState: selain sesuai konvensi repo, ini juga
  // memberi `dataUpdatedAt` — stempel waktu murni untuk menghitung sisa jendela
  // balas tanpa memanggil Date.now() saat render.
  const { data, isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['mitraReviews'],
    queryFn: async () => {
      // Endpoint ulasan publik menerima id ATAU username; ambil id mitra sendiri
      // dari /partners/me supaya halaman ini tak bergantung username di URL.
      const me = await fetchAPI<{ id: string }>('/partners/me');
      if (!me.success || !me.data?.id) throw new Error('Profil mitra tidak ditemukan');
      const res = await fetchAPI<{ reviews: PartnerReview[]; summary: ReviewSummary }>(
        `/partners/${me.data.id}/reviews?limit=50&page=1`,
      );
      if (!res.success || !res.data) throw new Error('Gagal memuat ulasan');
      return res.data;
    },
    enabled: isAuthorized,
  });

  const reviews = Array.isArray(data?.reviews) ? data.reviews : [];
  const summary = data?.summary ?? null;

  const handleReply = async (reviewId: string) => {
    const content = (draft[reviewId] ?? '').trim();
    if (content.length < 5) {
      showToast('Balasan minimal 5 karakter.', 'error');
      return;
    }
    setSending(reviewId);
    const res = await fetchAPI(`/reviews/${reviewId}/response`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    setSending(null);
    if (res.success) {
      showToast('Balasan terkirim.');
      setDraft((prev) => ({ ...prev, [reviewId]: '' }));
      refetch();
    } else {
      showToast(
        res.message === 'RESPONSE_DEADLINE_PASSED'
          ? 'Batas waktu membalas ulasan ini (7 hari) sudah lewat.'
          : res.message || 'Gagal mengirim balasan.',
        'error',
      );
    }
  };

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-brand-gray-60 pb-20">
      <MobilePageHeader title="Ulasan Pelanggan" alwaysShow backHref="/mitra/dashboard" maxWidthClass="max-w-3xl" />

      <div className="max-w-3xl mx-auto w-full px-4 py-4 sm:py-6">
        {isLoading ? (
          <PageSkeleton />
        ) : (
          <>
            {summary && summary.total_reviews > 0 && (
              <div className="bg-white rounded-xl border border-brand-gray-100 p-4 mb-4 flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-brand-gray-900">{summary.avg_rating.toFixed(1)}</div>
                  <div className="flex gap-0.5 justify-center mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= Math.round(summary.avg_rating)
                            ? 'fill-brand-warning text-brand-warning'
                            : 'fill-brand-gray-100 text-brand-gray-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-sm text-brand-gray-700">
                  <p className="font-semibold text-brand-gray-900">{summary.total_reviews} ulasan</p>
                  <p className="text-xs text-brand-gray-450 mt-0.5">
                    Balas ulasan dalam 7 hari — balasan tampil di profil publik Anda.
                  </p>
                </div>
              </div>
            )}

            {reviews.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="Belum ada ulasan"
                description="Ulasan dari pelanggan akan muncul di sini setelah pesanan selesai."
              />
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => {
                  const createdMs = Date.parse(review.created_at);
                  const bisaBalas =
                    !review.partner_response?.content &&
                    !isNaN(createdMs) &&
                    dataUpdatedAt - createdMs < RESPONSE_WINDOW_MS;
                  const aspek = ASPECT_LABELS.map(({ key, label }) => ({
                    label,
                    value: typeof review[key] === 'number' ? (review[key] as number) : null,
                  })).filter((a) => a.value !== null);

                  return (
                    <div key={review.id} className="bg-white rounded-xl border border-brand-gray-100 p-4">
                      <div className="flex gap-3">
                        <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 bg-brand-gray-100 flex items-center justify-center text-sm font-medium text-brand-gray-700">
                          {review.customer_avatar ? (
                            <Image
                              src={review.customer_avatar}
                              alt={review.customer_name}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          ) : (
                            getInitial(review.customer_name)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm text-brand-gray-900">{review.customer_name}</p>
                            <span className="text-xs text-brand-gray-400 shrink-0">
                              {!isNaN(createdMs)
                                ? formatDistanceToNow(new Date(createdMs), { addSuffix: true, locale: localeId })
                                : ''}
                            </span>
                          </div>
                          <div className="flex gap-0.5 mt-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < review.rating
                                    ? 'fill-brand-warning text-brand-warning'
                                    : 'fill-brand-gray-100 text-brand-gray-100'
                                }`}
                              />
                            ))}
                          </div>
                          {review.comment && (
                            <p className="text-sm text-brand-gray-700 mt-2">{review.comment}</p>
                          )}

                          {aspek.length > 0 && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                              {aspek.map((a) => (
                                <span key={a.label} className="flex items-center gap-1 text-[12px] text-brand-gray-700">
                                  <span className="text-brand-gray-450">{a.label}</span>
                                  <Star className="w-3 h-3 fill-brand-warning text-brand-warning" />
                                  <span className="font-medium">{a.value}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {Array.isArray(review.image_urls) && review.image_urls.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2.5">
                              {review.image_urls.map((url, i) => (
                                <a
                                  key={url}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="relative w-16 h-16 rounded-lg overflow-hidden border border-brand-gray-100 bg-brand-gray-100"
                                >
                                  <Image
                                    src={url}
                                    alt={`Foto ulasan ${i + 1} dari ${review.customer_name}`}
                                    fill
                                    sizes="64px"
                                    className="object-cover"
                                  />
                                </a>
                              ))}
                            </div>
                          )}

                          {review.partner_response?.content ? (
                            <div className="mt-3 rounded-lg border-l-2 border-brand-red bg-brand-gray-60 px-3 py-2.5">
                              <p className="text-[12px] font-semibold text-brand-gray-900 mb-1">Balasan Anda</p>
                              <p className="text-[13px] leading-relaxed text-brand-gray-700">
                                {review.partner_response.content}
                              </p>
                            </div>
                          ) : bisaBalas ? (
                            <div className="mt-3">
                              <textarea
                                value={draft[review.id] ?? ''}
                                onChange={(e) =>
                                  setDraft((prev) => ({ ...prev, [review.id]: e.target.value }))
                                }
                                maxLength={MAX_RESPONSE_LENGTH}
                                rows={3}
                                placeholder="Tulis balasan yang sopan dan informatif…"
                                className="w-full border border-brand-gray-100 rounded p-2.5 text-sm text-brand-gray-900 placeholder-brand-gray-450 focus:outline-none focus:border-brand-red resize-none"
                              />
                              <div className="flex items-center justify-between mt-1.5">
                                <span className="text-[11px] text-brand-gray-450">
                                  {(draft[review.id] ?? '').length}/{MAX_RESPONSE_LENGTH}
                                </span>
                                <Button
                                  size="sm"
                                  className="bg-brand-red hover:bg-brand-red-dark rounded"
                                  disabled={sending === review.id || (draft[review.id] ?? '').trim().length < 5}
                                  onClick={() => handleReply(review.id)}
                                >
                                  {sending === review.id ? 'Mengirim…' : 'Kirim Balasan'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-3 text-[12px] text-brand-gray-450">
                              Batas waktu membalas (7 hari) sudah lewat.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
