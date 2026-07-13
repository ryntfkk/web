"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ImagePlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getErrorMessage } from '@/types/api';

const MIN_PRICE = 50000; // Sesuai MinTransaction backend
const MAX_PHOTOS = 5;

export default function NewMitraServicePage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    price: '',
    duration_minutes: '60',
    description: '',
    included_items: '',
    excluded_items: '',
  });

  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetchAPI<any>('/categories');
        if (res.success && res.data) {
          setCategories(Array.isArray(res.data) ? res.data : res.data.categories ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch categories");
      }
    };
    if (isAuthorized) {
      fetchCategories();
    }
  }, [isAuthorized]);

  useEffect(() => {
    // Bersihkan object URL saat unmount
    return () => photos.forEach(p => URL.revokeObjectURL(p.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const room = MAX_PHOTOS - photos.length;
    const accepted = files.slice(0, room).map(file => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos(prev => [...prev, ...accepted]);
    if (files.length > room) setError(`Maksimal ${MAX_PHOTOS} foto layanan`);
    e.target.value = '';
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const { success, data } = await fetchAPI<{ upload_url: string; file_url: string }>('/partners/upload/presigned-url', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, content_type: file.type }),
      credentials: 'include',
    });
    if (!success || !data) throw new Error('Gagal mendapatkan URL upload');

    const uploadRes = await fetch(data.upload_url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!uploadRes.ok) throw new Error('Gagal mengunggah foto');
    return data.file_url;
  };

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
    if (numPrice < MIN_PRICE) {
      setError(`Harga minimum layanan adalah Rp ${new Intl.NumberFormat('id-ID').format(MIN_PRICE)}`);
      return;
    }
    if (numDuration < 15) {
      setError('Durasi minimum layanan adalah 15 menit');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Buat layanan
      setProgress('Menyimpan layanan...');
      const res = await fetchAPI<{ id: string }>('/partners/me/services', {
        method: 'POST',
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

      if (!res.success || !res.data) {
        setError(getErrorMessage(res));
        setLoading(false);
        setProgress('');
        return;
      }

      // 2. Upload & lampirkan foto (jika ada)
      const serviceId = (res.data as any).id ?? (res.data as any).data?.id;
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

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setForm({ ...form, price: '' });
      return;
    }
    setForm({ ...form, price: new Intl.NumberFormat('id-ID').format(parseInt(val, 10)) });
  };

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center px-4 py-4 gap-3">
          <button type="button" onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <h1 className="text-base font-bold text-[#1c1b1b]">Tambah Layanan Baru</h1>
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
              <p className="text-xs text-[#9e8e8c] mt-1">Minimal Rp 50.000</p>
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

          {/* Foto Layanan */}
          <div>
            <label className="block text-sm font-semibold text-[#1c1b1b] mb-2">
              Foto Layanan <span className="text-[#9e8e8c] font-normal">(opsional, maks {MAX_PHOTOS})</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, idx) => (
                <div key={p.preview} className="relative aspect-square rounded-lg overflow-hidden border border-[#e5e2e1]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 bg-[#b51822] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">UTAMA</span>
                  )}
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-[#e5e2e1] flex flex-col items-center justify-center gap-1 text-[#9e8e8c] hover:border-[#b51822] hover:text-[#b51822] transition-colors"
                >
                  <ImagePlus className="w-6 h-6" />
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

          {error && <div className="bg-[#FFF5F5] text-[#E53E3E] text-sm p-3 rounded-lg border border-[#FEB2B2]">{error}</div>}

          <div className="pt-4 border-t border-[#e5e2e1]">
            <Button
              type="submit"
              className="w-full bg-[#b51822] hover:bg-[#90121a] rounded h-12 text-base font-bold"
              disabled={loading}
            >
              {loading ? (progress || 'Menyimpan...') : 'Simpan Layanan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
