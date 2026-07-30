"use client";

import { getInitial } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';


interface OrderInfo {
  id: string;
  order_number: string;
  partner?: { name: string; avatar_url?: string };
  review?: { id: string };
}

export default function ReviewClient() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthorized || !orderId) return;
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    const res = await fetchAPI<any>(`/orders/${orderId}`);
    if (res.success && res.data) {
      const data = (res.data as any).data ?? res.data;
      if (data.status !== 'COMPLETED') {
        router.replace(`/orders/${orderId}`);
        return;
      }
      setOrder(data);
      if (data.review) {
        // Already reviewed, redirect
        router.replace(`/orders/${orderId}`);
        return;
      }
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (rating === 0) { setError('Pilih rating bintang terlebih dahulu.'); return; }
    if (comment.trim().length < 10) { setError('Ulasan wajib diisi minimal 10 karakter.'); return; }
    setSubmitting(true);
    setError('');
    const res = await fetchAPI('/reviews', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, rating, comment: comment.trim() }),
    });
    if (res.success) {
      setSubmitted(true);
    } else {
      // Backend memakai kode mesin REVIEW_ALREADY_EXISTS (message = kode itu
      // sendiri, bukan teks Inggris "already reviewed") — cocokkan res.code.
      if (res.code === 'REVIEW_ALREADY_EXISTS') {
        router.replace(`/orders/${orderId}`);
      } else {
        setError(res.message || 'Gagal mengirim ulasan.');
      }
    }
    setSubmitting(false);
  };

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;
  if (loading) {
    return (
      <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="bg-white rounded-xl border border-brand-gray-100 p-6 space-y-5">
            <div className="flex items-center gap-3 pb-6 border-b border-brand-gray-100">
              <Skeleton className="w-12 h-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Submitted success state
  if (submitted) {
    return (
      <div className="page-h bg-brand-gray-60 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center">
          {/* Animated stars */}
          <div className="flex justify-center gap-1 mb-6">
            {[1, 2, 3, 4, 5].map((s, i) => (
              <Star
                key={s}
                className="w-8 h-8 fill-brand-warning text-brand-warning animate-bounce"
                style={{ animationDelay: `${i * 0.1}s`, animationDuration: '0.5s' }}
              />
            ))}
          </div>
          <CheckCircle className="w-12 h-12 text-brand-success mx-auto mb-4" />
          <h2 className="text-xl font-bold text-brand-gray-900 mb-2">Ulasan Terkirim!</h2>
          <p className="text-sm text-brand-gray-700 mb-6">
            Terima kasih telah memberikan ulasan. Ulasan Anda membantu mitra dan pengguna lain.
          </p>
          {/* Preview ulasan */}
          <div className="bg-brand-surface-warm rounded-lg p-4 text-left mb-6">
            <p className="font-semibold text-sm text-brand-gray-900 mb-1">{order?.partner?.name}</p>
            <div className="flex items-center gap-1 mb-2">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= rating ? 'fill-brand-warning text-brand-warning' : 'text-brand-gray-100'}`} />
              ))}
              <span className="text-xs text-brand-gray-700 ml-1">{rating}/5</span>
            </div>
            {comment && <p className="text-sm text-brand-gray-700 italic">"{comment}"</p>}
          </div>
          <Button
            className="w-full bg-brand-red hover:bg-brand-red-dark rounded"
            onClick={() => router.push('/')}
          >
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
      {/* Header */}
      {/* Header khusus mobile — di desktop TopNavbar sudah jadi satu-satunya header. */}
      <div className="bg-white border-b border-brand-gray-100 px-4 py-4 sticky top-0 z-10 lg:hidden">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push(`/orders/${orderId}`)} className="p-2 -ml-2 hover:bg-brand-gray-60 rounded">
            <ArrowLeft className="w-5 h-5 text-brand-gray-700" />
          </button>
          <h1 className="text-base font-bold text-brand-gray-900">Beri Ulasan</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900 mb-6">Beri Ulasan</h1>
        <div className="bg-white rounded-xl border border-brand-gray-100 p-6">
          {/* Partner Info */}
          {order?.partner && (
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-brand-gray-100">
              <div className="relative w-12 h-12 rounded-full bg-brand-gray-100 flex items-center justify-center text-lg font-bold text-brand-gray-700 shrink-0 overflow-hidden">
                {order.partner.avatar_url
                  ? <Image src={order.partner.avatar_url} alt={order.partner.name} fill sizes="48px" className="object-cover" />
                  : getInitial(order.partner.name)
                }
              </div>
              <div>
                <p className="font-semibold text-brand-gray-900">{order.partner.name}</p>
                <p className="text-xs text-brand-gray-450">Pesanan {order.order_number}</p>
              </div>
            </div>
          )}

          {/* Rating */}
          <div className="text-center mb-6">
            <p className="text-sm font-medium text-brand-gray-700 mb-3">Bagaimana pengalaman Anda?</p>
            <StarRating value={rating} onChange={setRating} size="lg" className="justify-center" />
            {rating > 0 && (
              <p className="text-sm text-brand-gray-700 mt-2">
                {['', 'Buruk', 'Kurang Baik', 'Cukup', 'Baik', 'Sangat Baik!'][rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-brand-gray-900 mb-2">
              Komentar <span className="text-brand-error">*</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={300}
              rows={4}
              className="w-full border border-brand-gray-100 rounded p-3 text-sm text-brand-gray-900 placeholder-brand-gray-450 focus:outline-none focus:border-brand-red resize-none"
              placeholder="Tuliskan pengalaman Anda..."
            />
            <p className="text-xs text-brand-gray-450 text-right mt-1">{comment.length}/300</p>
          </div>

          {error && (
            <p className="mt-3 text-sm text-brand-error">{error}</p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Button
              className="w-full bg-brand-red hover:bg-brand-red-dark rounded"
              onClick={handleSubmit}
              disabled={submitting || rating === 0 || comment.trim().length < 10}
            >
              {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-brand-gray-700"
              onClick={() => router.push(`/orders/${orderId}`)}
            >
              Nanti Saja
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
