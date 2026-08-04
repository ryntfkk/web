"use client";

import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Image as ImageIcon, Loader2, Pencil } from 'lucide-react';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import { Button } from '@/components/ui/button';
import MitraModal from '@/components/mitra/MitraModal';
import { PageSkeleton } from '@/components/ui/skeleton';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getErrorMessage } from '@/types/api';

interface Portfolio {
  id: string;
  photo_url: string;
  caption?: string;
}

export default function MitraPortfolioPage() {
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Keterangan foto (P2): dulu selalu dikirim kosong saat unggah dan tidak
  // pernah bisa diubah, jadi field-nya ada di data tapi mati di UI.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      fetchPortfolios();
    }
  }, [isAuthorized]);

  const fetchPortfolios = async () => {
    setLoading(true);
    const res = await fetchAPI<Portfolio[]>('/partners/me/portfolios');
    if (res.success && res.data) {
      setPortfolios(res.data);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/partners/me/portfolios/${deleteId}`, { method: 'DELETE' });
    if (res.success) {
      setPortfolios(portfolios.filter(p => p.id !== deleteId));
    } else {
      setError(getErrorMessage(res));
    }
    setDeleteId(null);
  };

  const startEditCaption = (id: string, current?: string) => {
    setEditingId(id);
    setCaptionDraft(current || '');
  };

  const saveCaption = async () => {
    if (!editingId || savingCaption) return;
    setSavingCaption(true);
    try {
      const res = await fetchAPI<Portfolio>(`/partners/me/portfolios/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ caption: captionDraft }),
      });
      if (res.success && res.data) {
        // Pakai nilai dari server, bukan draft lokal: kalau server memangkas
        // atau menolak, UI tidak boleh menampilkan yang tidak tersimpan.
        const saved = res.data;
        setPortfolios(prev => prev.map(p => (p.id === saved.id ? { ...p, caption: saved.caption } : p)));
        setEditingId(null);
      } else {
        setError(getErrorMessage(res) || 'Gagal menyimpan keterangan');
      }
    } finally {
      setSavingCaption(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (portfolios.length >= 5) {
      setError('Maksimal 5 foto portofolio');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Format file harus berupa gambar');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran maksimal file 5MB');
      return;
    }

    setError('');
    setUploading(true);

    try {
      // 1. Get Presigned URL
      const { success, data } = await fetchAPI<{ upload_url: string, file_url: string }>('/partners/upload/presigned-url', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, content_type: file.type }),
      });

      if (!success || !data) throw new Error('Gagal mendapatkan URL upload');

      // 2. Upload to S3
      const uploadRes = await fetch(data.upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!uploadRes.ok) throw new Error('Gagal mengupload file ke server');

      // 3. Save to backend
      const saveRes = await fetchAPI<Portfolio>('/partners/me/portfolios', {
        method: 'POST',
        body: JSON.stringify({ photo_url: data.file_url, caption: '' })
      });

      if (saveRes.success && saveRes.data) {
        setPortfolios([...portfolios, saveRes.data]);
      } else {
        throw new Error(getErrorMessage(saveRes) || 'Gagal menyimpan portofolio');
      }

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-24">
      {/* Header */}
      <MitraPageHeader
        title="Galeri Portofolio"
        subtitle="Maksimal 5 foto"
        variant="list"
        backHref="/mitra/profile"
        breadcrumbs={[{ label: 'Profil', href: '/mitra/profile' }, { label: 'Galeri Portofolio' }]}
      />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="bg-brand-error-soft border border-brand-error-border text-brand-error p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            [1, 2].map(i => <div key={i} className="aspect-square bg-brand-gray-100 rounded-lg animate-pulse" />)
          ) : (
            <>
              {portfolios.map((item) => (
                <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border border-brand-gray-100 group bg-white">
                  <img src={item.photo_url} alt="Portfolio" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => startEditCaption(item.id, item.caption)}
                      className="p-2 bg-white rounded-full text-brand-gray-700 hover:bg-brand-gray-60 transition-colors"
                      aria-label="Ubah keterangan"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="p-2 bg-white rounded-full text-brand-error hover:bg-brand-error-soft transition-colors"
                      aria-label="Hapus"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  {item.caption && (
                    <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6 text-[11px] leading-snug text-white line-clamp-2">
                      {item.caption}
                    </p>
                  )}
                </div>
              ))}
              
              {portfolios.length < 5 && (
                <div 
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`aspect-square rounded-lg border-2 border-dashed border-brand-gray-200 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer bg-white ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-brand-red hover:bg-brand-red-soft'}`}
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-brand-gray-450 animate-spin" />
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-brand-gray-60 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-brand-gray-400" />
                      </div>
                      <span className="text-xs font-medium text-brand-gray-700">Tambah Foto</span>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        
        {!loading && portfolios.length === 0 && (
          <div className="text-center py-10">
            <ImageIcon className="w-12 h-12 text-brand-gray-100 mx-auto mb-3" />
            <p className="text-sm text-brand-gray-700">Belum ada foto portofolio.</p>
            <p className="text-xs text-brand-gray-450 mt-1">Tambahkan foto hasil kerja Anda untuk menarik lebih banyak pelanggan.</p>
          </div>
        )}

        {editingId && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <div className="w-full max-w-sm rounded-lg bg-white p-5">
              <h3 className="mb-1 text-base font-semibold text-brand-gray-900">Keterangan Foto</h3>
              <p className="mb-3 text-xs text-brand-gray-450">
                Jelaskan pekerjaan pada foto ini — pelanggan memakainya untuk menilai hasil kerjamu.
              </p>
              <textarea
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value.slice(0, 255))}
                rows={3}
                maxLength={255}
                autoFocus
                className="w-full rounded-md border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
                placeholder="Contoh: Servis AC 1 PK, cuci evaporator + isi freon"
              />
              <p className="mt-1 text-right text-[11px] text-brand-gray-450">{captionDraft.length}/255</p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingId(null)} disabled={savingCaption}>
                  Batal
                </Button>
                <Button className="flex-1" onClick={saveCaption} isLoading={savingCaption}>
                  Simpan
                </Button>
              </div>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      <MitraModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Hapus Foto?"
        description="Foto ini akan dihapus permanen dari galeri portofolio Anda."
        footer={
          <>
            <Button variant="outline" className="flex-1 rounded-md border-brand-gray-100" onClick={() => setDeleteId(null)}>
              Batal
            </Button>
            <Button className="flex-1 rounded-md bg-brand-error hover:bg-brand-error-dark" onClick={handleDelete}>
              Hapus
            </Button>
          </>
        }
      />
    </div>
  );
}
