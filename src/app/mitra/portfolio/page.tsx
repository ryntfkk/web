"use client";

import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Image as ImageIcon, Loader2, X } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { Button } from '@/components/ui/button';
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
      <MobilePageHeader alwaysShow title="Galeri Portofolio" subtitle="Maksimal 5 foto" />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="bg-brand-error-soft border border-brand-error-border text-brand-error p-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            [1, 2].map(i => <div key={i} className="aspect-square bg-brand-gray-100 rounded-xl animate-pulse" />)
          ) : (
            <>
              {portfolios.map((item) => (
                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden border border-brand-gray-100 group bg-white">
                  <img src={item.photo_url} alt="Portfolio" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="p-2 bg-white rounded-full text-brand-error hover:bg-brand-error-soft transition-colors"
                      aria-label="Hapus"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              
              {portfolios.length < 5 && (
                <div 
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`aspect-square rounded-xl border-2 border-dashed border-brand-gray-200 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer bg-white ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-brand-red hover:bg-brand-red-soft'}`}
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

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      {/* Delete Dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-brand-gray-900">Hapus Foto?</h3>
              <button onClick={() => setDeleteId(null)} aria-label="Tutup">
                <X className="w-5 h-5 text-brand-gray-450" />
              </button>
            </div>
            <p className="text-sm text-brand-gray-700 mb-6">
              Foto ini akan dihapus permanen dari galeri portofolio Anda.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded border-brand-gray-100" onClick={() => setDeleteId(null)}>
                Batal
              </Button>
              <Button className="flex-1 bg-brand-error hover:bg-brand-error-dark rounded" onClick={handleDelete}>
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
