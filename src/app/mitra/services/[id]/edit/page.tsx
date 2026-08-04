'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/ui/skeleton';
import { PhotoUploader } from '@/components/ui/photo-uploader';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import MitraModal from '@/components/mitra/MitraModal';
import ServiceForm, {
  EMPTY_SERVICE_FORM,
  type ServiceFormValues,
  type ServiceSubmitPayload,
  type ServiceVariationDraft,
} from '@/components/mitra/ServiceForm';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getErrorMessage } from '@/types/api';

const MAX_PHOTOS = 5;

interface ServiceDetail {
  name?: string;
  category_id?: string;
  price?: number;
  unit?: string;
  estimated_duration?: number;
  min_order?: number;
  description?: string;
  included_items?: string[];
  excluded_items?: string[];
  faqs?: { question: string; answer: string }[];
  requirements?: { code?: string; label?: string; note?: string; is_mandatory?: boolean }[];
  variations?: { name: string; price: number }[];
}

interface ServicePhoto {
  id: string;
  photo_url: string;
}

/**
 * Field & validasinya dipakai bersama halaman "tambah" lewat `ServiceForm`
 * (P2). Yang khas di sini: prefill dari server dan pengelolaan foto yang sudah
 * tersimpan — foto lama dihapus lewat endpointnya sendiri, bukan ikut PATCH.
 */
export default function EditMitraServicePage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const serviceId = params?.id as string;

  const [initialValues, setInitialValues] = useState<ServiceFormValues | undefined>();
  const [initialVariations, setInitialVariations] = useState<ServiceVariationDraft[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ServicePhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);

  const loadService = useCallback(async () => {
    try {
      // Ambil SATU layanan (P2). Dulu mengunduh seluruh daftar lalu mencari
      // satu item di klien — makin banyak layanan makin mahal, dan layanan
      // NONAKTIF tidak pernah ketemu karena daftarnya hanya berisi yang aktif.
      const svcRes = await fetchAPI<ServiceDetail>(`/partners/me/services/${serviceId}`);
      if (!svcRes.success || !svcRes.data) {
        setError(getErrorMessage(svcRes));
        return;
      }
      const service = svcRes.data;

      setInitialValues({
        ...EMPTY_SERVICE_FORM,
        name: service.name || '',
        category_id: service.category_id || '',
        price: service.price ? new Intl.NumberFormat('id-ID').format(service.price) : '',
        unit: service.unit || 'per_service',
        duration_minutes: service.estimated_duration ? String(service.estimated_duration) : '60',
        min_order: service.min_order ? String(service.min_order) : '1',
        description: service.description || '',
        included_items: service.included_items || [],
        excluded_items: service.excluded_items || [],
        faqs: service.faqs || [],
        // Prefill persyaratan: backend mengembalikan label yang sudah ter-resolve,
        // tapi form menyimpan code/custom_label — item katalog dikenali dari
        // code-nya, sisanya jadi teks bebas.
        requirements: Array.isArray(service.requirements)
          ? service.requirements.map((r) => ({
              code: r.code || undefined,
              custom_label: r.code ? undefined : r.label || '',
              note: r.note || '',
              is_mandatory: r.is_mandatory ?? true,
            }))
          : [],
      });

      setInitialVariations(
        Array.isArray(service.variations)
          ? service.variations.map((v) => ({
              name: v.name || '',
              price: v.price ? String(v.price) : '',
            }))
          : [],
      );

      const photosRes = await fetchAPI<ServicePhoto[]>(`/partners/me/services/${serviceId}/photos`);
      if (photosRes.success && photosRes.data) setExistingPhotos(photosRes.data);
    } catch {
      setError('Gagal memuat data layanan');
    } finally {
      setFetchLoading(false);
    }
  }, [serviceId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isAuthorized) loadService();
  }, [isAuthorized, loadService]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async (payload: ServiceSubmitPayload) => {
    setLoading(true);
    setError('');

    const res = await fetchAPI(`/partners/me/services/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    if (!res.success) {
      setError(getErrorMessage(res));
      setLoading(false);
      return;
    }

    for (const file of newPhotos) {
      try {
        const presigned = await fetchAPI<{ upload_url: string; file_url: string }>(
          '/partners/upload/presigned-url',
          { method: 'POST', body: JSON.stringify({ filename: file.name, content_type: file.type }) },
        );
        if (presigned.success && presigned.data) {
          const upload = await fetch(presigned.data.upload_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });
          if (upload.ok) {
            await fetchAPI(`/partners/me/services/${serviceId}/photos`, {
              method: 'POST',
              body: JSON.stringify({ photo_url: presigned.data.file_url }),
            });
          }
        }
      } catch (e) {
        console.error('failed upload', e);
      }
    }

    router.push('/mitra/services');
  };

  const handleDeletePhoto = async () => {
    if (!deletePhotoId) return;
    const res = await fetchAPI(`/partners/me/services/photos/${deletePhotoId}`, { method: 'DELETE' });
    if (res.success) {
      setExistingPhotos((prev) => prev.filter((p) => p.id !== deletePhotoId));
    } else {
      setError('Gagal menghapus foto');
    }
    setDeletePhotoId(null);
  };

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;
  if (fetchLoading) return <PageSkeleton />;

  return (
    <div className="page-h bg-brand-gray-60 pb-24">
      <MitraPageHeader
        title="Edit Layanan"
        variant="form"
        backHref="/mitra/services"
        breadcrumbs={[{ label: 'Layanan', href: '/mitra/services' }, { label: 'Edit Layanan' }]}
      />

      <MitraPageContainer variant="form" className="py-6">
        <ServiceForm
          initialValues={initialValues}
          initialVariations={initialVariations}
          submitLabel="Simpan Perubahan"
          submitting={loading}
          error={error}
          onSubmit={handleSubmit}
          photoSection={
            <div>
              <span className="mb-2 block text-sm font-semibold text-brand-gray-900">Foto Layanan</span>
              {existingPhotos.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-3">
                  {existingPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative h-20 w-20 overflow-hidden rounded-md border border-brand-gray-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.photo_url} alt="Foto layanan" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setDeletePhotoId(photo.id)}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                        aria-label="Hapus foto layanan"
                      >
                        <Trash2 className="h-5 w-5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <PhotoUploader
                value={newPhotos}
                onChange={setNewPhotos}
                maxPhotos={MAX_PHOTOS - existingPhotos.length}
              />
              <p className="mt-2 text-xs text-brand-gray-450">
                Format: JPG, PNG. Maks. 5MB per foto. Maksimal {MAX_PHOTOS} foto (
                {existingPhotos.length + newPhotos.length}/{MAX_PHOTOS}).
              </p>
            </div>
          }
        />
      </MitraPageContainer>

      <MitraModal
        open={!!deletePhotoId}
        onClose={() => setDeletePhotoId(null)}
        title="Hapus Foto?"
        description="Foto ini akan dihapus permanen dari layanan Anda."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-md border-brand-gray-100"
              onClick={() => setDeletePhotoId(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-md bg-brand-error hover:bg-brand-error-dark"
              onClick={handleDeletePhoto}
            >
              Hapus
            </Button>
          </>
        }
      />
    </div>
  );
}
