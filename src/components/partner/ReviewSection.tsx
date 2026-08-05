import { Star } from 'lucide-react';
import { getInitial } from '@/lib/utils';
import Image from 'next/image';
import { PartnerReview, ReviewSummary } from '@/hooks/usePartnerProfile';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface ReviewSectionProps {
  reviews: PartnerReview[];
  summary: ReviewSummary;
  /** Judul blok. Halaman produk memakai "Ulasan Layanan Ini". */
  title?: string;
  /** Copy saat belum ada ulasan . harus menyebut lingkupnya (mitra vs layanan). */
  emptyText?: string;
  /** Aksi di kaki blok, mis. tautan ke seluruh ulasan mitra. */
  footer?: React.ReactNode;
}

const ASPECT_LABELS: { key: keyof PartnerReview; label: string }[] = [
  { key: 'rating_quality', label: 'Kualitas' },
  { key: 'rating_punctuality', label: 'Ketepatan waktu' },
  { key: 'rating_communication', label: 'Komunikasi' },
];

/**
 * Rating per aspek satu ulasan. Sengaja ditampilkan per-ulasan, BUKAN sebagai
 * rata-rata gabungan: komponen ini hanya menerima satu halaman ulasan (10 item),
 * jadi "rata-rata" darinya akan menyesatkan bila mitra punya ratusan ulasan.
 */
function AspectRatings({ review }: { review: PartnerReview }) {
  const items = ASPECT_LABELS.map(({ key, label }) => ({
    label,
    value: typeof review[key] === 'number' ? (review[key] as number) : null,
  })).filter((it) => it.value !== null);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1 text-[12px] text-brand-gray-700">
          <span className="text-brand-gray-450">{it.label}</span>
          <Star className="w-3 h-3 fill-brand-warning text-brand-warning" />
          <span className="font-medium">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Foto yang dilampirkan pelanggan. Dibuka di tab baru . bukan lightbox penuh. */
function ReviewPhotos({ urls, author }: { urls: string[]; author: string }) {
  if (!urls.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2.5">
      {urls.map((url, i) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="relative w-16 h-16 rounded-lg overflow-hidden border border-brand-gray-100 bg-brand-gray-100 hover:border-brand-red transition-colors"
        >
          <Image
            src={url}
            alt={`Foto ulasan ${i + 1} dari ${author}`}
            fill
            className="object-cover"
            sizes="64px"
          />
        </a>
      ))}
    </div>
  );
}

export default function ReviewSection({
  reviews,
  summary,
  title = 'Ulasan Pelanggan',
  emptyText = 'Belum ada ulasan untuk mitra ini.',
  footer,
}: ReviewSectionProps) {
  // Ensure summary has valid numbers
  const validSummary = {
    total_reviews: typeof summary?.total_reviews === 'number' ? summary.total_reviews : 0,
    avg_rating: typeof summary?.avg_rating === 'number' ? summary.avg_rating : 0,
    count_5: typeof summary?.count_5 === 'number' ? summary.count_5 : 0,
    count_4: typeof summary?.count_4 === 'number' ? summary.count_4 : 0,
    count_3: typeof summary?.count_3 === 'number' ? summary.count_3 : 0,
    count_2: typeof summary?.count_2 === 'number' ? summary.count_2 : 0,
    count_1: typeof summary?.count_1 === 'number' ? summary.count_1 : 0,
  };

  if (validSummary.total_reviews === 0) {
    return (
      <div className="bg-white rounded p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-brand-gray-900 mb-3">{title}</h2>
        <div className="text-center py-8 text-brand-gray-450">{emptyText}</div>
        {footer && <div className="pt-2 text-center">{footer}</div>}
      </div>
    );
  }

  // Filter out invalid reviews
  const validReviews = Array.isArray(reviews)
    ? reviews.filter(r => r && typeof r.id === 'string')
    : [];

  return (
    <div className="bg-white rounded p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold text-brand-gray-900 mb-4">{title}</h2>

      <div className="flex flex-col md:flex-row gap-6 mb-8 border-b border-brand-gray-100 pb-6">
        <div className="flex flex-col items-center justify-center min-w-[150px]">
          <div className="text-4xl font-bold text-brand-gray-900 mb-1">{validSummary.avg_rating.toFixed(1)}</div>
          <div className="flex gap-1 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${star <= Math.round(validSummary.avg_rating) ? 'fill-brand-warning text-brand-warning' : 'fill-brand-gray-100 text-brand-gray-100'}`}
              />
            ))}
          </div>
          <div className="text-sm text-brand-gray-450">{validSummary.total_reviews} Ulasan</div>
        </div>

        <div className="flex-1 space-y-2">
          {[
            { stars: 5, count: validSummary.count_5 },
            { stars: 4, count: validSummary.count_4 },
            { stars: 3, count: validSummary.count_3 },
            { stars: 2, count: validSummary.count_2 },
            { stars: 1, count: validSummary.count_1 },
          ].map((item) => (
            <div key={item.stars} className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1 w-8 text-brand-gray-700">
                <span>{item.stars}</span>
                <Star className="w-3 h-3 fill-brand-warning text-brand-warning" />
              </div>
              <div className="flex-1 h-2 bg-brand-gray-100 rounded overflow-hidden">
                <div
                  className="h-full bg-brand-warning rounded"
                  style={{ width: `${validSummary.total_reviews > 0 ? (item.count / validSummary.total_reviews) * 100 : 0}%` }}
                />
              </div>
              <div className="w-8 text-right text-brand-gray-450 text-xs">{item.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {validReviews.map((review) => (
          <div key={review.id} className="flex gap-4">
            <div className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-brand-gray-100">
              {review.customer_avatar && typeof review.customer_avatar === 'string' ? (
                <Image
                  src={review.customer_avatar}
                  alt={typeof review.customer_name === 'string' ? review.customer_name : 'Customer'}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-brand-gray-400 text-sm font-medium">
                  {getInitial(typeof review.customer_name === 'string' ? review.customer_name : undefined)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h4 className="font-medium text-brand-gray-900 text-sm sm:text-base">
                    {typeof review.customer_name === 'string' ? review.customer_name : 'Pelanggan'}
                  </h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < (typeof review.rating === 'number' ? review.rating : 0) ? 'fill-brand-warning text-brand-warning' : 'fill-brand-gray-100 text-brand-gray-100'}`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-brand-gray-400">
                  {typeof review.created_at === 'string' && !isNaN(Date.parse(review.created_at))
                    ? formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: id })
                    : ''}
                </span>
              </div>
              <p className="text-brand-gray-700 text-sm mt-2">
                {typeof review.comment === 'string' ? review.comment : ''}
              </p>

              <AspectRatings review={review} />

              {Array.isArray(review.image_urls) && review.image_urls.length > 0 && (
                <ReviewPhotos
                  urls={review.image_urls.filter((u) => typeof u === 'string' && u.length > 0)}
                  author={typeof review.customer_name === 'string' ? review.customer_name : 'pelanggan'}
                />
              )}

              {review.partner_response?.content && (
                <div className="mt-3 rounded-lg border-l-2 border-brand-red bg-brand-gray-60 px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-semibold text-brand-gray-900">Balasan mitra</span>
                    {review.partner_response.created_at &&
                      !isNaN(Date.parse(review.partner_response.created_at)) && (
                        <span className="text-[11px] text-brand-gray-400">
                          {formatDistanceToNow(new Date(review.partner_response.created_at), {
                            addSuffix: true,
                            locale: id,
                          })}
                        </span>
                      )}
                  </div>
                  <p className="text-[13px] leading-relaxed text-brand-gray-700">
                    {review.partner_response.content}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {footer && <div className="mt-5 pt-4 border-t border-brand-gray-100 text-center">{footer}</div>}
    </div>
  );
}
