"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { X, Trash2 } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/ui/skeleton';
import { VariationsEditor } from '@/components/ui/variations-editor';
import CategoryPicker from '@/components/mitra/CategoryPicker';
import { fetchAPI } from '@/lib/api';
import { PhotoUploader } from '@/components/ui/photo-uploader';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getErrorMessage } from '@/types/api';
import { unwrapData, unitLabel } from '@/lib/order-utils';
import { DynamicStringList } from '@/components/ui/dynamic-string-list';
import { DynamicFaqList, type Faq } from '@/components/ui/dynamic-faq-list';
import {
  RequirementsEditor,
  type RequirementCatalogItem,
  type ServiceRequirement,
} from '@/components/ui/requirements-editor';
import { formatPrice } from '@/lib/format';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';

export default function EditMitraServicePage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const serviceId = params?.id as string;
  // MinTransaction dari platform_settings — dulu konstanta 50000 yang harus
  // disamakan manual dengan backend setiap kali admin mengubahnya.
  const MIN_PRICE = usePlatformConfig().min_transaction;

  // Katalog persyaratan dari backend — admin bisa mengubahnya tanpa deploy web.
  const [reqCatalog, setReqCatalog] = useState<RequirementCatalogItem[]>([]);

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    price: '',
    unit: 'per_service',
    duration_minutes: '60',
    min_order: '1',
    description: '',
    included_items: [] as string[],
    excluded_items: [] as string[],
    faqs: [] as Faq[],
    requirements: [] as ServiceRequirement[],
  });

  const [variations, setVariations] = useState<{ name: string; price: string }[]>([]);

  const [existingPhotos, setExistingPhotos] = useState<{id: string, photo_url: string}[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);

  useEffect(() => {
    // Pelengkap: gagal memuat katalog tidak boleh menghalangi mitra menyimpan.
    let alive = true;
    fetchAPI<RequirementCatalogItem[]>('/partners/requirement-catalog')
      .then(res => {
        if (alive && res.success && res.data) setReqCatalog(res.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const svcsRes = await fetchAPI<any>('/partners/me/services');
        if (svcsRes.success && svcsRes.data) {
          const svcsData = unwrapData<any>(svcsRes.data);
          if (Array.isArray(svcsData)) {
            const service = svcsData.find((s: any) => s.id === serviceId);
            if (service) {
              setForm({
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
                // Prefill persyaratan: backend mengembalikan label yang sudah
                // ter-resolve, tapi form menyimpan code/custom_label — item
                // katalog dikenali dari code-nya, sisanya jadi teks bebas.
                requirements: Array.isArray(service.requirements)
                  ? service.requirements.map(
                      (r: { code?: string; label?: string; note?: string; is_mandatory?: boolean }) => ({
                        code: r.code || undefined,
                        custom_label: r.code ? undefined : r.label || '',
                        note: r.note || '',
                        is_mandatory: r.is_mandatory ?? true,
                      }),
                    )
                  : [],
              });
              if (Array.isArray(service.variations)) {
                setVariations(
                  service.variations.map((v: { name: string; price: number }) => ({
                    name: v.name || '',
                    price: v.price ? String(v.price) : '',
                  })),
                );
              }
            } else {
              setError('Layanan tidak ditemukan');
            }
          }

          const photosRes = await fetchAPI<any>(`/partners/me/services/${serviceId}/photos`);
          if (photosRes.success && photosRes.data) {
            setExistingPhotos(unwrapData(photosRes.data));
          }
        }
      } catch (err) {
        console.error("Failed to fetch data");
        setError('Gagal memuat data layanan');
      } finally {
        setFetchLoading(false);
      }
    };
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized, serviceId]);

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseInt(form.price.replace(/\D/g, ''), 10) || 0;
    const isPerHour = form.unit === 'per_hour';
    // per_hour: estimasi otomatis 1 jam (60 menit); selain itu dari input mitra.
    const numDuration = isPerHour ? 60 : parseInt(form.duration_minutes, 10);
    const numMinOrder = Math.max(1, parseInt(form.min_order || '1', 10) || 1);
    const included = form.included_items.map(i => i.trim()).filter(Boolean);
    const excluded = form.excluded_items.map(i => i.trim()).filter(Boolean);
    const faqs = form.faqs.map(f => ({ question: f.question.trim(), answer: f.answer.trim() })).filter(f => f.question && f.answer);
    const requirementsPayload = form.requirements
      .map(r => ({
        code: r.code,
        custom_label: r.custom_label?.trim() || undefined,
        note: r.note?.trim() || '',
        is_mandatory: r.is_mandatory,
      }))
      .filter(r => r.code || r.custom_label);

    const parsedVariations = variations
      .map(v => ({ name: v.name.trim(), price: parseInt(v.price || '0', 10) || 0 }))
      .filter(v => v.name || v.price);
    const hasVariations = parsedVariations.length > 0;

    if (!form.name || !form.category_id || !numDuration || included.length === 0 || excluded.length === 0) {
      setError('Semua field wajib diisi, termasuk minimal 1 include dan 1 exclude');
      return;
    }
    if (hasVariations) {
      for (const v of parsedVariations) {
        if (!v.name || !v.price) {
          setError('Setiap variasi wajib punya nama dan harga.');
          return;
        }
        if (v.price < MIN_PRICE) {
          setError(`Harga setiap variasi minimal ${formatPrice(MIN_PRICE)}`);
          return;
        }
      }
    } else {
      if (!numPrice) {
        setError('Harga wajib diisi (atau tambahkan variasi).');
        return;
      }
      if (numPrice < MIN_PRICE) {
        setError(`Harga minimum layanan adalah ${formatPrice(MIN_PRICE)}`);
        return;
      }
    }
    if (!isPerHour && numDuration < 15) {
      setError('Durasi minimum layanan adalah 15 menit');
      return;
    }

    const effectivePrice = hasVariations
      ? Math.min(...parsedVariations.map(v => v.price))
      : numPrice;

    setLoading(true);
    setError('');

    const res = await fetchAPI(`/partners/me/services/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: form.name,
        category_id: form.category_id,
        price: effectivePrice,
        unit: form.unit,
        estimated_duration: numDuration,
        min_order: numMinOrder,
        variations: hasVariations ? parsedVariations : [],
        description: form.description,
        included_items: included,
        excluded_items: excluded,
        faqs: faqs,
        requirements: requirementsPayload,
      })
    });

    if (res.success) {
      if (newPhotos.length > 0) {
        for (const file of newPhotos) {
          try {
            const presigned = await fetchAPI<any>('/partners/upload/presigned-url', {
              method: 'POST', body: JSON.stringify({filename: file.name, content_type: file.type})
            });
            if (presigned.success && presigned.data) {
              const upload = await fetch(presigned.data.upload_url, {
                method: 'PUT', body: file, headers: {'Content-Type': file.type}
              });
              if (upload.ok) {
                await fetchAPI(`/partners/me/services/${serviceId}/photos`, {
                  method: 'POST', body: JSON.stringify({photo_url: presigned.data.file_url})
                });
              }
            }
          } catch(e) { console.error("failed upload", e) }
        }
      }
      router.push('/mitra/services');
    } else {
      setError(getErrorMessage(res));
      setLoading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!deletePhotoId) return;
    const res = await fetchAPI(`/partners/me/services/photos/${deletePhotoId}`, { method: 'DELETE' });
    if (res.success) {
      setExistingPhotos(existingPhotos.filter(p => p.id !== deletePhotoId));
    } else {
      setError('Gagal menghapus foto');
    }
    setDeletePhotoId(null);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setForm({ ...form, price: '' });
      return;
    }
    setForm({ ...form, price: new Intl.NumberFormat('id-ID').format(parseInt(val, 10)) });
  };

  if (fetchLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-h bg-brand-gray-60 pb-24">
      {/* Header */}
      <MobilePageHeader alwaysShow title="Edit Layanan" />

      <div className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-brand-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Nama Layanan</label>
            <input
              type="text"
              placeholder="Contoh: Cuci AC 0.5 - 1 PK"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
            />
          </div>

          <CategoryPicker
            value={form.category_id}
            onChange={(id) => setForm((f) => ({ ...f, category_id: id }))}
          />

          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Satuan Harga</label>
            <select
              value={form.unit}
              onChange={e => {
                const unit = e.target.value;
                setForm(f => ({ ...f, unit, duration_minutes: unit === 'per_hour' ? '60' : f.duration_minutes }));
              }}
              className="w-full p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red bg-white"
            >
              <option value="per_service">Per Jasa (borongan)</option>
              <option value="per_hour">Per Jam</option>
              <option value="per_unit">Per Unit</option>
              <option value="per_kg">Per Kg</option>
            </select>
            <p className="text-xs text-brand-gray-450 mt-1">Harga ditagih per {unitLabel(form.unit)}. Pelanggan memilih jumlah saat memesan.</p>
          </div>

          {/* Variasi (opsional) — bila diisi, harga tunggal disembunyikan */}
          <VariationsEditor value={variations} onChange={setVariations} minPrice={MIN_PRICE} />

          <div className="grid grid-cols-2 gap-4">
            {variations.length === 0 ? (
              <div>
                <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Harga</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-900 font-bold text-sm">Rp</span>
                  <input
                    type="text"
                    value={form.price}
                    onChange={handlePriceChange}
                    placeholder="0"
                    className="w-full p-3 pl-10 border border-brand-gray-100 rounded text-sm font-bold text-brand-gray-900 focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Harga</label>
                <div className="w-full p-3 border border-dashed border-brand-gray-100 rounded text-sm text-brand-gray-450 bg-brand-gray-60">
                  Otomatis dari variasi termurah
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Minimal Order</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.min_order}
                onChange={e => setForm({ ...form, min_order: e.target.value })}
                className="w-full p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
              />
              <p className="text-xs text-brand-gray-450 mt-1">Jumlah minimal per pesanan ({unitLabel(form.unit)})</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Estimasi Durasi (Menit)</label>
            <input
              type="number"
              min="15"
              step="15"
              value={form.unit === 'per_hour' ? 60 : form.duration_minutes}
              disabled={form.unit === 'per_hour'}
              onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
              className="w-full p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red disabled:bg-brand-gray-60 disabled:text-brand-gray-450"
            />
            <p className="text-xs text-brand-gray-450 mt-1">
              {form.unit === 'per_hour' ? 'Otomatis 1 jam / satuan' : 'Minimal 15 menit'}
            </p>
          </div>

          <DynamicStringList
            label="Termasuk (Include)"
            items={form.included_items}
            onChange={items => setForm({ ...form, included_items: items })}
            placeholder="Contoh: Pengecekan AC"
            required
          />

          <DynamicStringList
            label="Tidak Termasuk (Exclude)"
            items={form.excluded_items}
            onChange={items => setForm({ ...form, excluded_items: items })}
            placeholder="Contoh: Penambahan Freon"
            required
          />

          <RequirementsEditor
            items={form.requirements}
            catalog={reqCatalog}
            onChange={items => setForm({ ...form, requirements: items })}
          />

          <DynamicFaqList
            label="Pertanyaan Umum (FAQ) (opsional)"
            items={form.faqs}
            onChange={items => setForm({ ...form, faqs: items })}
          />

          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Deskripsi <span className="text-brand-gray-450 font-normal">(opsional)</span></label>
            <textarea
              placeholder="Deskripsi detail tentang layanan ini..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Foto Layanan</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {existingPhotos.map(photo => (
                <div key={photo.id} className="relative w-20 h-20 rounded-md border border-brand-gray-100 overflow-hidden group">
                  <img src={photo.photo_url} alt="Service" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setDeletePhotoId(photo.id)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Hapus"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))}
            </div>
            
            <PhotoUploader
              value={newPhotos}
              onChange={setNewPhotos}
              maxPhotos={5 - existingPhotos.length}
            />
            <p className="text-xs text-brand-gray-450 mt-2">Format: JPG, PNG. Maks. 5MB per foto. Maksimal 5 foto ({existingPhotos.length + newPhotos.length}/5).</p>
          </div>

          {error && <div className="bg-brand-error-soft text-brand-error text-sm p-3 rounded-lg border border-brand-error-border">{error}</div>}

          <div className="pt-4 border-t border-brand-gray-100">
            <Button
              type="submit"
              className="w-full bg-brand-red hover:bg-brand-red-dark rounded h-12 text-base font-bold"
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </div>

      {/* Delete Photo Dialog */}
      {deletePhotoId && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-brand-gray-900">Hapus Foto?</h3>
              <button type="button" onClick={() => setDeletePhotoId(null)} aria-label="Tutup">
                <X className="w-5 h-5 text-brand-gray-450" />
              </button>
            </div>
            <p className="text-sm text-brand-gray-700 mb-6">
              Foto ini akan dihapus permanen dari layanan Anda.
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1 rounded border-brand-gray-100" onClick={() => setDeletePhotoId(null)}>
                Batal
              </Button>
              <Button type="button" className="flex-1 bg-brand-error hover:bg-brand-error-dark rounded" onClick={handleDeletePhoto}>
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
