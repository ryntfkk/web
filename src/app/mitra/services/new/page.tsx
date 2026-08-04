'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, X } from 'lucide-react';

import { PageSkeleton } from '@/components/ui/skeleton';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import ServiceForm, { type ServiceSubmitPayload } from '@/components/mitra/ServiceForm';
import { fetchAPI } from '@/lib/api';
import { track } from '@/lib/analytics';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getErrorMessage } from '@/types/api';

const MAX_PHOTOS = 5;

/**
 * Seluruh field & validasinya hidup di `ServiceForm` — dipakai bersama halaman
 * edit (P2). Yang tersisa di sini hanya yang memang khas "buat baru": foto
 * dikumpulkan dulu di klien, lalu diunggah SETELAH layanan punya id.
 */
export default function NewMitraServicePage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Bersihkan object URL saat unmount.
    return () => photos.forEach((p) => URL.revokeObjectURL(p.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const room = MAX_PHOTOS - photos.length;
    const accepted = files.slice(0, room).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...accepted]);
    if (files.length > room) setError(`Maksimal ${MAX_PHOTOS} foto layanan`);
    e.target.value = '';
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const { success, data } = await fetchAPI<{ upload_url: string; file_url: string }>(
      '/partners/upload/presigned-url',
      {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, content_type: file.type }),
        credentials: 'include',
      },
    );
    if (!success || !data) throw new Error('Gagal mendapatkan URL upload');

    const uploadRes = await fetch(data.upload_url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!uploadRes.ok) throw new Error('Gagal mengunggah foto');
    return data.file_url;
  };

  const handleSubmit = async (payload: ServiceSubmitPayload) => {
    setLoading(true);
    setError('');

    try {
      setProgress('Menyimpan layanan...');
      const res = await fetchAPI<{ id: string }>('/partners/me/services', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.success || !res.data) {
        setError(getErrorMessage(res));
        setLoading(false);
        setProgress('');
        return;
      }

      const serviceId = res.data.id;
      track('partner_service_created', { service_id: serviceId, unit: payload.unit });
      if (photos.length > 0 && serviceId) {
        for (let i = 0; i < photos.length; i++) {
          setProgress(`Mengunggah foto ${i + 1}/${photos.length}...`);
          const url = await uploadPhoto(photos[i].file);
          const attach = await fetchAPI(`/partners/me/services/${serviceId}/photos`, {
            method: 'POST',
            body: JSON.stringify({ photo_url: url }),
          });
          if (!attach.success) throw new Error(getErrorMessage(attach));
        }
      }

      router.push('/mitra/services');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan layanan');
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="page-h bg-brand-gray-60 pb-24">
      <MitraPageHeader
        title="Tambah Layanan Baru"
        variant="form"
        backHref="/mitra/services"
        breadcrumbs={[{ label: 'Layanan', href: '/mitra/services' }, { label: 'Tambah Layanan' }]}
      />

      <MitraPageContainer variant="form" className="py-6">
        <ServiceForm
          submitLabel="Simpan Layanan"
          submitting={loading}
          progressLabel={progress}
          error={error}
          onSubmit={handleSubmit}
          photoSection={
            <div>
              <span className="mb-2 block text-sm font-semibold text-brand-gray-900">
                Foto Layanan{' '}
                <span className="font-normal text-brand-gray-450">(opsional, maks {MAX_PHOTOS})</span>
              </span>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, idx) => (
                  <div
                    key={p.preview}
                    className="relative aspect-square overflow-hidden rounded-lg border border-brand-gray-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                      aria-label={`Hapus foto ${idx + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 rounded-md bg-brand-red px-1.5 py-0.5 text-[9px] font-bold text-white">
                        UTAMA
                      </span>
                    )}
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-brand-gray-100 text-brand-gray-450 transition-colors hover:border-brand-red hover:text-brand-red"
                  >
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-[10px] font-semibold">Tambah</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleAddPhotos}
                className="hidden"
              />
            </div>
          }
        />
      </MitraPageContainer>
    </div>
  );
}
