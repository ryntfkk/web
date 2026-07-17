"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
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
      if (res.message?.toLowerCase().includes('already reviewed') || (res as any).status === 400) {
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
    return <div className="page-h bg-[#f7f5f4] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  // Submitted success state
  if (submitted) {
    return (
      <div className="page-h bg-[#f7f5f4] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md max-w-sm w-full p-8 text-center">
          {/* Animated stars */}
          <div className="flex justify-center gap-1 mb-6">
            {[1, 2, 3, 4, 5].map((s, i) => (
              <Star
                key={s}
                className="w-8 h-8 fill-[#D69E2E] text-[#D69E2E] animate-bounce"
                style={{ animationDelay: `${i * 0.1}s`, animationDuration: '0.5s' }}
              />
            ))}
          </div>
          <CheckCircle className="w-12 h-12 text-[#38A169] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1c1b1b] mb-2">Ulasan Terkirim!</h2>
          <p className="text-sm text-[#5b403e] mb-6">
            Terima kasih telah memberikan ulasan. Ulasan Anda membantu mitra dan pengguna lain.
          </p>
          {/* Preview ulasan */}
          <div className="bg-[#f4f0ef] rounded-lg p-4 text-left mb-6">
            <p className="font-semibold text-sm text-[#1c1b1b] mb-1">{order?.partner?.name}</p>
            <div className="flex items-center gap-1 mb-2">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= rating ? 'fill-[#D69E2E] text-[#D69E2E]' : 'text-[#e5e2e1]'}`} />
              ))}
              <span className="text-xs text-[#5b403e] ml-1">{rating}/5</span>
            </div>
            {comment && <p className="text-sm text-[#5b403e] italic">"{comment}"</p>}
          </div>
          <Button
            className="w-full bg-[#b51822] hover:bg-[#90121a] rounded"
            onClick={() => router.push('/')}
          >
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Header */}
      {/* Header khusus mobile — di desktop TopNavbar sudah jadi satu-satunya header. */}
      <div className="bg-white border-b border-[#e5e2e1] px-4 py-4 sticky top-0 z-10 lg:hidden">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push(`/orders/${orderId}`)} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <h1 className="text-base font-bold text-[#1c1b1b]">Beri Ulasan</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-[#1c1b1b] mb-6">Beri Ulasan</h1>
        <div className="bg-white rounded-xl border border-[#e5e2e1] p-6">
          {/* Partner Info */}
          {order?.partner && (
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#e5e2e1]">
              <div className="w-12 h-12 rounded-full bg-[#e5e2e1] flex items-center justify-center text-lg font-bold text-[#5b403e] shrink-0 overflow-hidden">
                {order.partner.avatar_url
                  ? <img src={order.partner.avatar_url} alt={order.partner.name} className="w-full h-full object-cover" />
                  : order.partner.name.charAt(0).toUpperCase()
                }
              </div>
              <div>
                <p className="font-semibold text-[#1c1b1b]">{order.partner.name}</p>
                <p className="text-xs text-[#9e8e8c]">Pesanan {order.order_number}</p>
              </div>
            </div>
          )}

          {/* Rating */}
          <div className="text-center mb-6">
            <p className="text-sm font-medium text-[#5b403e] mb-3">Bagaimana pengalaman Anda?</p>
            <StarRating value={rating} onChange={setRating} size="lg" className="justify-center" />
            {rating > 0 && (
              <p className="text-sm text-[#5b403e] mt-2">
                {['', 'Buruk', 'Kurang Baik', 'Cukup', 'Baik', 'Sangat Baik!'][rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-[#1c1b1b] mb-2">
              Komentar <span className="text-[#E53E3E]">*</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={300}
              rows={4}
              className="w-full border border-[#e5e2e1] rounded p-3 text-sm text-[#1c1b1b] placeholder-[#9e8e8c] focus:outline-none focus:border-[#b51822] resize-none"
              placeholder="Tuliskan pengalaman Anda..."
            />
            <p className="text-xs text-[#9e8e8c] text-right mt-1">{comment.length}/300</p>
          </div>

          {error && (
            <p className="mt-3 text-sm text-[#E53E3E]">{error}</p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Button
              className="w-full bg-[#b51822] hover:bg-[#90121a] rounded"
              onClick={handleSubmit}
              disabled={submitting || rating === 0 || comment.trim().length < 10}
            >
              {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-[#5b403e]"
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
