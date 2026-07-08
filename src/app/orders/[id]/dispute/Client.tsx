"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoUploader } from '@/components/ui/photo-uploader';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';


export default function DisputeClient() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
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
    
    fetchOrder();
  }, [isAuthenticated, orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    const res = await fetchAPI<any>(`/orders/${orderId}`);
    if (res.success && res.data) {
      const data = (res.data as any).data ?? res.data;
      setOrder(data);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (reason.length < 20) {
      setError('Deskripsi masalah minimal 20 karakter.');
      return;
    }
    
    setSubmitting(true);
    setError('');

    try {
      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append('order_id', orderId);
      formData.append('reason', reason);
      photos.forEach(photo => formData.append('photos', photo));

      // Note: we can't use our standard fetchAPI wrapper easily with FormData
      // because it forces Content-Type: application/json.
      // We will do a direct fetch here or modify fetchAPI to support FormData.
      // Assuming backend supports /disputes endpoint.
      
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.poskojasa.com/api/v1'}/orders/${orderId}/dispute`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Platform': 'web',
          'X-App-Version': '1.0.0',
        },
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        // Redirect to detail page
        router.push(`/orders/${orderId}`);
        // Buka WA di tab baru
        window.open(`https://wa.me/6281234567890?text=Halo CS Posko Jasa. Saya melaporkan sengketa pada Pesanan %23${order?.order_number}.`, '_blank');
      } else {
        setError(data.message || 'Gagal mengirim laporan sengketa.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;
  if (loading) {
    return <div className="min-h-screen bg-[#f7f5f4] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#b51822] border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <h1 className="text-base font-bold text-[#1c1b1b]">Lapor Masalah</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-[#FFF5F5] border border-[#FEB2B2] rounded-lg p-4 flex gap-3 items-start mb-6">
          <AlertTriangle className="w-5 h-5 text-[#E53E3E] shrink-0 mt-0.5" />
          <p className="text-sm text-[#E53E3E] font-medium leading-relaxed">
            Pesanan akan masuk ke status Sengketa. Dana akan dibekukan sementara hingga Tim CS kami memfasilitasi penyelesaian.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#e5e2e1] p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">
              Ceritakan Detail Masalah *
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={500}
              rows={5}
              className="w-full border border-[#e5e2e1] rounded p-3 text-sm text-[#1c1b1b] placeholder-[#9e8e8c] focus:outline-none focus:border-[#b51822] resize-none"
              placeholder="Contoh: Pekerjaan tidak selesai, hasil kurang bersih, atau mitra merusak barang..."
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-[#9e8e8c]">Minimal 20 karakter</p>
              <p className="text-xs text-[#9e8e8c]">{reason.length}/500</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">
              Unggah Bukti Foto <span className="text-[#9e8e8c] font-normal">(opsional)</span>
            </label>
            <p className="text-xs text-[#9e8e8c] mb-3">
              Foto bukti akan sangat membantu tim CS menyelesaikan masalah dengan cepat. Maksimal 3 foto.
            </p>
            <PhotoUploader value={photos} onChange={setPhotos} maxPhotos={3} />
          </div>

          {error && (
            <p className="text-sm text-[#E53E3E] bg-[#FFF5F5] p-3 rounded">{error}</p>
          )}

          <Button
            className="w-full bg-[#E53E3E] hover:bg-[#C53030] rounded"
            onClick={handleSubmit}
            disabled={submitting || reason.length < 20}
          >
            {submitting ? 'Mengirim...' : 'Kirim Laporan & Hubungi CS'}
          </Button>
        </div>
      </div>
    </div>
  );
}
