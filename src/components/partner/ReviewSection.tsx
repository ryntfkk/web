import { Star } from 'lucide-react';
import Image from 'next/image';
import { PartnerReview, ReviewSummary } from '@/hooks/usePartnerProfile';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface ReviewSectionProps {
  reviews: PartnerReview[];
  summary: ReviewSummary;
}

export default function ReviewSection({ reviews, summary }: ReviewSectionProps) {
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
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Ulasan Pelanggan</h2>
        <div className="text-center py-8 text-gray-500">
          Belum ada ulasan untuk mitra ini.
        </div>
      </div>
    );
  }

  // Filter out invalid reviews
  const validReviews = Array.isArray(reviews)
    ? reviews.filter(r => r && typeof r.id === 'string')
    : [];

  return (
    <div className="bg-white rounded p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Ulasan Pelanggan</h2>

      <div className="flex flex-col md:flex-row gap-6 mb-8 border-b border-gray-100 pb-6">
        <div className="flex flex-col items-center justify-center min-w-[150px]">
          <div className="text-4xl font-bold text-gray-900 mb-1">{validSummary.avg_rating.toFixed(1)}</div>
          <div className="flex gap-1 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${star <= Math.round(validSummary.avg_rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
              />
            ))}
          </div>
          <div className="text-sm text-gray-500">{validSummary.total_reviews} Ulasan</div>
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
              <div className="flex items-center gap-1 w-8 text-gray-600">
                <span>{item.stars}</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              </div>
              <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded"
                  style={{ width: `${validSummary.total_reviews > 0 ? (item.count / validSummary.total_reviews) * 100 : 0}%` }}
                />
              </div>
              <div className="w-8 text-right text-gray-500 text-xs">{item.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {validReviews.map((review) => (
          <div key={review.id} className="flex gap-4">
            <div className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-gray-100">
              {review.customer_avatar && typeof review.customer_avatar === 'string' ? (
                <Image
                  src={review.customer_avatar}
                  alt={typeof review.customer_name === 'string' ? review.customer_name : 'Customer'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">
                  {(typeof review.customer_name === 'string' ? review.customer_name.charAt(0) : '?').toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                    {typeof review.customer_name === 'string' ? review.customer_name : 'Pelanggan'}
                  </h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < (typeof review.rating === 'number' ? review.rating : 0) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {typeof review.created_at === 'string' && !isNaN(Date.parse(review.created_at))
                    ? formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: id })
                    : ''}
                </span>
              </div>
              <p className="text-gray-600 text-sm mt-2">
                {typeof review.comment === 'string' ? review.comment : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
