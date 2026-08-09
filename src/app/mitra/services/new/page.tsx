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
 * Seluruh field & validasinya hidup di `ServiceForm` . dipakai bersama halaman
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
  /**
   * Id layanan yang SUDAH terbuat pada percobaan sebelumnya (F-23). Selama ini
   * terisi, submit berikutnya melanjutkan unggahan foto alih-alih membuat
   * layanan baru. `uploadedCount` adalah ref, bukan state: nilainya dibaca di
   * dalam loop yang sedang berjalan, dan render ulang di tengah loop akan
   * membacanya basi.
   */
  const [createdServiceId, setCreatedServiceId] = useState<string | null>(null);
  const uploadedCount = useRef(0);

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
    // Foto yang sudah TERPASANG di server tidak bisa dicabut dari sini . yang
    // menghapusnya adalah halaman edit layanan. Membiarkannya hilang dari daftar
    // ini hanya membuat mitra mengira fotonya batal terunggah, padahal masih ada.
    if (idx < uploadedCount.current) {
      setError('Foto ini sudah terunggah. Hapus lewat halaman edit layanan setelah selesai.');
      return;
    }
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
        // file_size WAJIB: ikut ditandatangani ke presigned URL, ditolak bila 0.
        body: JSON.stringify({ filename: file.name, content_type: file.type, file_size: file.size }),
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
      // F-23: layanan dibuat SEKALI. Kalau langkah unggah foto gagal (sinyal
      // putus, S3 menolak), layanannya SUDAH ADA . menekan "Simpan" lagi dulu
      // membuat layanan KEDUA yang identik, dan mitra harus menghapusnya sendiri
      // tanpa pernah diberi tahu itu terjadi. Menyimpan id-nya membuat percobaan
      // berikutnya melanjutkan dari langkah foto, bukan mengulang dari awal.
      let serviceId = createdServiceId;
      if (!serviceId) {
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
        serviceId = res.data.id;
        setCreatedServiceId(serviceId);
        track('partner_service_created', { service_id: serviceId, unit: payload.unit });
      }

      // Foto yang SUDAH terpasang tidak diunggah ulang . percobaan kedua hanya
      // meneruskan sisanya, bukan menggandakan yang sudah berhasil.
      for (let i = uploadedCount.current; i < photos.length; i++) {
        setProgress(`Mengunggah foto ${i + 1}/${photos.length}...`);
        const url = await uploadPhoto(photos[i].file);
        const attach = await fetchAPI(`/partners/me/services/${serviceId}/photos`, {
          method: 'POST',
          body: JSON.stringify({ photo_url: url }),
        });
        if (!attach.success) throw new Error(getErrorMessage(attach));
        uploadedCount.current = i + 1;
      }

      router.push('/mitra/services');
    } catch (err) {
      setError(
        (err instanceof Error ? err.message : 'Gagal menambahkan layanan') +
          (createdServiceId
            ? ' . layanannya sudah tersimpan, tekan Simpan lagi untuk melanjutkan unggahan foto.'
            : ''),
      );
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="pb-28">
      <MitraPageHeader
        title="Tambah Layanan Baru"
        variant="form"
        backHref="/mitra/services"
        breadcrumbs={[{ label: 'Layanan', href: '/mitra/services' }, { label: 'Tambah Layanan' }]}
      />

      <MitraPageContainer variant="form">
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
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
                {photos.map((p, idx) => (
                  <div
                    key={p.preview}
                    className="group relative aspect-square overflow-hidden rounded-md border border-brand-gray-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                      aria-label={`Hapus foto ${idx + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 rounded-md bg-brand-red px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        UTAMA
                      </span>
                    )}
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-brand-gray-200 bg-brand-gray-50 text-brand-gray-450 transition-all duration-200 hover:border-brand-red hover:bg-brand-red/5 hover:text-brand-red"
                  >
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-[11px] font-medium leading-none">Tambah</span>
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-brand-gray-450">
                Format: JPG, PNG. Maks. 5MB per foto.
              </p>
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
