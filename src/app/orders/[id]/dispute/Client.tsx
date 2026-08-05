"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoUploader } from '@/components/ui/photo-uploader';
import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PageSkeleton, Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';


export default function DisputeClient() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
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
      const unwrappedOrder = res.data;
      if (unwrappedOrder.status !== 'WAITING_CUSTOMER_CONFIRM' && unwrappedOrder.status !== 'IN_PROGRESS') {
        router.replace(`/orders/${orderId}`);
        return;
      }
      setOrder(unwrappedOrder);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (reason.trim().length < 20) {
      setError('Deskripsi masalah minimal 20 karakter.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 1. Upload bukti foto via presigned URL (pola yang sama dengan booking)
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const presignedRes = await fetchAPI<any>('/uploads/presigned-url', {
          method: 'POST',
          body: JSON.stringify({ filename: photo.name, content_type: photo.type }),
        });
        const presigned = presignedRes.success ? presignedRes.data : null;
        if (!presigned?.upload_url) throw new Error('Gagal mendapatkan upload URL');

        const uploadRes = await fetch(presigned.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': photo.type },
          body: photo,
        });
        if (!uploadRes.ok) throw new Error(`Gagal mengunggah foto "${photo.name}"`);
        photoUrls.push(presigned.file_url);
      }

      // 2. Kirim laporan sengketa sebagai JSON (fetchAPI = auto token-refresh)
      const res = await fetchAPI(`/disputes`, {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId,
          dispute_type: 'OTHER',
          reason: reason.trim(),
          evidence_urls: photoUrls
        }),
      });

      if (res.success) {
        // Sengketa tercatat & admin ternotifikasi. Untuk berbalas dgn CS,
        // pengguna dapat memakai tombol "Hubungi CS" (chat) di halaman pesanan.
        router.push(`/orders/${orderId}`);
      } else {
        setError(getErrorMessage(res));
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;
  if (loading) {
    return (
      <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-40" />
          <div className="rounded-lg border border-brand-gray-100 bg-white p-6 space-y-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
      {/* Header */}
      {/* Header khusus mobile . di desktop TopNavbar sudah jadi satu-satunya header. */}
      <div className="bg-white border-b border-brand-gray-100 px-4 py-4 sticky top-0 z-10 lg:hidden">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push(`/orders/${orderId}`)} className="p-2 -ml-2 hover:bg-brand-gray-60 rounded">
            <ArrowLeft className="w-5 h-5 text-brand-gray-700" />
          </button>
          <h1 className="text-base font-bold text-brand-gray-900">Lapor Masalah</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900 mb-6">Lapor Masalah</h1>
        <div className="bg-brand-error-soft border border-brand-error/40 rounded-lg p-4 flex gap-3 items-start mb-6">
          <AlertTriangle className="w-5 h-5 text-brand-error shrink-0 mt-0.5" />
          <p className="text-sm text-brand-error font-medium leading-relaxed">
            Pesanan akan masuk ke status Sengketa. Dana akan dibekukan sementara hingga Tim CS kami memfasilitasi penyelesaian.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-brand-gray-100 p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">
              Ceritakan Detail Masalah *
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={500}
              rows={5}
              className="w-full border border-brand-gray-100 rounded-md p-3 text-sm text-brand-gray-900 placeholder:text-brand-gray-450 focus:outline-none focus:border-brand-red resize-none"
              placeholder="Contoh: Pekerjaan tidak selesai, hasil kurang bersih, atau mitra merusak barang..."
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-brand-gray-450">Minimal 20 karakter</p>
              <p className="text-xs text-brand-gray-450">{reason.length}/500</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">
              Unggah Bukti Foto <span className="text-brand-gray-450 font-normal">(opsional)</span>
            </label>
            <p className="text-xs text-brand-gray-450 mb-3">
              Foto bukti akan sangat membantu tim CS menyelesaikan masalah dengan cepat. Maksimal 3 foto.
            </p>
            <PhotoUploader value={photos} onChange={setPhotos} maxPhotos={3} />
          </div>

          {error && (
            <p className="text-sm text-brand-error bg-brand-error-soft p-3 rounded-md">{error}</p>
          )}

          <Button
            variant="danger"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || reason.length < 20}
          >
            {submitting ? 'Mengirim...' : 'Kirim Laporan Sengketa'}
          </Button>
        </div>
      </div>
    </div>
  );
}
