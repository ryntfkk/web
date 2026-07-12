"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { PhotoUploader } from '@/components/ui/photo-uploader';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ROLE_PARTNER } from '@/lib/constants';
import { getErrorMessage } from '@/types/api';

export default function EditMitraServicePage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const serviceId = params?.id as string;

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    price: '',
    duration_minutes: '60',
    description: '',
    included_items: '',
    excluded_items: '',
  });

  const [existingPhotos, setExistingPhotos] = useState<{id: string, photo_url: string}[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);

  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await fetchAPI<any>('/categories');
        if (catRes.success && catRes.data) {
          setCategories(catRes.data);
        }

        const svcsRes = await fetchAPI<any>('/partners/me/services');
        if (svcsRes.success && svcsRes.data) {
          const service = svcsRes.data.find((s: any) => s.id === serviceId);
          if (service) {
            setForm({
              name: service.name || '',
              category_id: service.category_id || '',
              price: service.price ? new Intl.NumberFormat('id-ID').format(service.price) : '',
              duration_minutes: service.estimated_duration ? String(service.estimated_duration) : '60',
              description: service.description || '',
              included_items: service.included_items ? service.included_items.join('\n') : '',
              excluded_items: service.excluded_items ? service.excluded_items.join('\n') : '',
            });
          } else {
            setError('Layanan tidak ditemukan');
          }

          const photosRes = await fetchAPI<any>(`/partners/me/services/${serviceId}/photos`);
          if (photosRes.success && photosRes.data) {
            setExistingPhotos(photosRes.data);
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

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseInt(form.price.replace(/\D/g, ''), 10);
    const numDuration = parseInt(form.duration_minutes, 10);
    const included = form.included_items.split('\n').map(i => i.trim()).filter(Boolean);
    const excluded = form.excluded_items.split('\n').map(i => i.trim()).filter(Boolean);

    if (!form.name || !form.category_id || !numPrice || !numDuration || included.length === 0 || excluded.length === 0) {
      setError('Semua field wajib diisi, termasuk minimal 1 include dan 1 exclude');
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetchAPI(`/partners/me/services/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: form.name,
        category_id: form.category_id,
        price: numPrice,
        estimated_duration: numDuration,
        description: form.description,
        included_items: included,
        excluded_items: excluded,
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

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Hapus foto ini?')) return;
    const res = await fetchAPI(`/partners/me/services/photos/${photoId}`, { method: 'DELETE' });
    if (res.success) {
      setExistingPhotos(existingPhotos.filter(p => p.id !== photoId));
    } else {
      alert('Gagal menghapus foto');
    }
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
    return (
      <div className="page-h bg-[#f7f5f4] flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#b51822]" />
      </div>
    );
  }

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center px-4 py-4 gap-3">
          <button type="button" onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <h1 className="text-base font-bold text-[#1c1b1b]">Edit Layanan</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#e5e2e1] p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Nama Layanan</label>
            <input
              type="text"
              placeholder="Contoh: Cuci AC 0.5 - 1 PK"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Kategori</label>
            <select
              value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}
              className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822] bg-white"
            >
              <option value="">Pilih Kategori</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Harga</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c1b1b] font-bold text-sm">Rp</span>
                <input
                  type="text"
                  value={form.price}
                  onChange={handlePriceChange}
                  placeholder="0"
                  className="w-full p-3 pl-10 border border-[#e5e2e1] rounded text-sm font-bold text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Estimasi Durasi (Menit)</label>
              <input
                type="number"
                min="15"
                step="15"
                value={form.duration_minutes}
                onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Termasuk (Include) <span className="text-[#9e8e8c] font-normal">(1 per baris)</span></label>
            <textarea
              placeholder={"Pengecekan AC\nCuci Indoor\nCuci Outdoor"}
              value={form.included_items}
              onChange={e => setForm({ ...form, included_items: e.target.value })}
              rows={3}
              className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Tidak Termasuk (Exclude) <span className="text-[#9e8e8c] font-normal">(1 per baris)</span></label>
            <textarea
              placeholder={"Penambahan Freon\nPerbaikan Sparepart"}
              value={form.excluded_items}
              onChange={e => setForm({ ...form, excluded_items: e.target.value })}
              rows={3}
              className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Deskripsi <span className="text-[#9e8e8c] font-normal">(opsional)</span></label>
            <textarea
              placeholder="Deskripsi detail tentang layanan ini..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">Foto Layanan</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {existingPhotos.map(photo => (
                <div key={photo.id} className="relative w-20 h-20 rounded-md border border-[#e5e2e1] overflow-hidden group">
                  <img src={photo.photo_url} alt="Service" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
            <p className="text-xs text-[#9e8e8c] mt-2">Format: JPG, PNG. Maks. 5MB per foto. Maksimal 5 foto ({existingPhotos.length + newPhotos.length}/5).</p>
          </div>

          {error && <div className="bg-[#FFF5F5] text-[#E53E3E] text-sm p-3 rounded-lg border border-[#FEB2B2]">{error}</div>}

          <div className="pt-4 border-t border-[#e5e2e1]">
            <Button
              type="submit"
              className="w-full bg-[#b51822] hover:bg-[#90121a] rounded h-12 text-base font-bold"
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
