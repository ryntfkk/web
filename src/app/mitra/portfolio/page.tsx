"use client";

import { useEffect, useState, useRef } from 'react';
import { ArrowDown, ArrowUp, Image as ImageIcon, Loader2, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import { Button } from '@/components/ui/button';
import MitraModal from '@/components/mitra/MitraModal';
import MitraInfoBanner from '@/components/mitra/MitraInfoBanner';
import DataState from '@/components/mitra/DataState';
import { PageSkeleton } from '@/components/ui/skeleton';
import { fetchAPI } from '@/lib/api';
import { ensureUploadableImage } from '@/lib/image-upload';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getErrorMessage } from '@/types/api';
import Image from 'next/image';

interface Portfolio {
  id: string;
  photo_url: string;
  caption?: string;
  sort_order: number;
  /** Tidak dikirim bila foto ini portofolio umum. */
  service_id?: string;
  service_name?: string;
}

interface ServiceOption {
  id: string;
  name: string;
}

export default function MitraPortfolioPage() {
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  // Gagal MEMUAT dibedakan dari error aksi (`error`): kegagalan jaringan tidak
  // boleh tampil sebagai galeri kosong (P1-11).
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Keterangan foto (P2): dulu selalu dikirim kosong saat unggah dan tidak
  // pernah bisa diubah, jadi field-nya ada di data tapi mati di UI.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);
  // Urutan & kaitan layanan (000071). Foto pertama adalah yang dilihat calon
  // pelanggan lebih dulu, jadi mitra harus bisa menaruh karya terbaiknya di depan.
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthorized) {
      fetchPortfolios();
      // Daftar layanan untuk dropdown kaitan. Kegagalannya tidak ditampilkan
      // sebagai error halaman . galerinya sendiri tetap berguna tanpa itu.
      fetchAPI<ServiceOption[]>('/partners/me/services').then((res) => {
        if (res.success) setServices(res.data ?? []);
      });
    }
  }, [isAuthorized]);

  async function fetchPortfolios() {
    setLoading(true);
    const res = await fetchAPI<Portfolio[]>('/partners/me/portfolios');
    if (res.success) {
      setPortfolios(res.data ?? []);
      setFetchError(null);
    } else {
      setFetchError(getErrorMessage(res) || 'Gagal memuat portofolio');
    }
    setLoading(false);
  };

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetchAPI(`/partners/me/portfolios/${deleteId}`, { method: 'DELETE' });
    if (res.success) {
      setPortfolios(portfolios.filter(p => p.id !== deleteId));
    } else {
      setError(getErrorMessage(res));
    }
    setDeleteId(null);
  };

  function startEditCaption(id: string, current?: string) {
    setEditingId(id);
    setCaptionDraft(current || '');
  };

  async function saveCaption() {
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

  /**
   * Memindahkan satu foto naik/turun lalu MENYIMPAN seluruh urutan.
   *
   * Urutan baru dipasang optimistis supaya panah terasa responsif, tetapi kalau
   * server menolak, daftar diambil ulang . layar tidak boleh menampilkan urutan
   * yang tidak tersimpan.
   */
  async function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= portfolios.length || savingOrder) return;

    const next = [...portfolios];
    [next[index], next[target]] = [next[target], next[index]];
    const previous = portfolios;
    setPortfolios(next);
    setSavingOrder(true);

    const res = await fetchAPI('/partners/me/portfolios/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids: next.map(p => p.id) }),
    });
    setSavingOrder(false);

    if (!res.success) {
      setPortfolios(previous);
      setError(getErrorMessage(res) || 'Gagal menyimpan urutan');
    }
  };

  async function linkToService(id: string, serviceId: string) {
    setLinkingId(id);
    const res = await fetchAPI<Portfolio>(`/partners/me/portfolios/${id}/service`, {
      method: 'PATCH',
      body: JSON.stringify({ service_id: serviceId }),
    });
    setLinkingId(null);
    if (res.success && res.data) {
      const saved = res.data;
      setPortfolios(prev =>
        prev.map(p =>
          p.id === saved.id
            ? { ...p, service_id: saved.service_id, service_name: saved.service_name }
            : p,
        ),
      );
    } else {
      setError(getErrorMessage(res) || 'Gagal mengaitkan foto ke layanan');
    }
  };

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original) return;

    if (portfolios.length >= 5) {
      setError('Maksimal 5 foto portofolio');
      return;
    }

    setError('');
    setUploading(true);

    try {
      // HEIC (kamera default iPhone) dikonversi ke JPEG di klien sebelum
      // divalidasi & diunggah . browser tak bisa menampilkannya dan backend
      // menolaknya. File lain lewat apa adanya.
      const file = await ensureUploadableImage(original);

      if (!file.type.startsWith('image/')) {
        setError('Format file harus berupa gambar');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Ukuran maksimal file 5MB');
        return;
      }

      // 1. Get Presigned URL
      const res = await fetchAPI<{ upload_url: string, file_url: string }>('/partners/upload/presigned-url', {
        method: 'POST',
        // file_size WAJIB: ikut ditandatangani ke presigned URL, ditolak bila 0.
        body: JSON.stringify({ filename: file.name, content_type: file.type, file_size: file.size }),
      });

      // Surface pesan asli backend (format ditolak dll.), bukan pesan generik.
      if (!res.success || !res.data) throw new Error(getErrorMessage(res) || 'Gagal mendapatkan URL upload');

      // 2. Upload to S3
      const uploadRes = await fetch(res.data.upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!uploadRes.ok) throw new Error('Gagal mengupload file ke server');

      // 3. Save to backend
      const saveRes = await fetchAPI<Portfolio>('/partners/me/portfolios', {
        method: 'POST',
        body: JSON.stringify({ photo_url: res.data.file_url, caption: '' })
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
    <div className="pb-6">
      {/* Header */}
      <MitraPageHeader
        title="Galeri Portofolio"
        subtitle="Maksimal 5 foto"
        variant="list"
        backHref="/mitra/profile"
        breadcrumbs={[{ label: 'Profil', href: '/mitra/profile' }, { label: 'Galeri Portofolio' }]}
        // Bebas ajakan verifikasi (permintaan pemilik).
        hidePreparationNotice
      />

      <MitraPageContainer variant="list" className="space-y-4">
        {error && (
          <MitraInfoBanner variant="error" role="alert">
            {error}
          </MitraInfoBanner>
        )}

        {/* isEmpty sengaja TIDAK dipakai: galeri kosong tetap harus menampilkan
            kotak "Tambah Foto" di grid, jadi keadaan kosongnya digambar sendiri
            di bawah. DataState di sini khusus memuat & gagal-memuat. */}
        <DataState
          isLoading={loading}
          error={fetchError}
          onRetry={fetchPortfolios}
          skeleton={
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {[1, 2].map(i => <div key={i} className="aspect-square bg-brand-gray-100 rounded-lg animate-pulse" />)}
            </div>
          }
        >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <>
              {portfolios.map((item, index) => (
                <div key={item.id} className="overflow-hidden rounded-lg border border-brand-gray-100 bg-white">
                  <div className="group relative aspect-square">
                    <Image src={item.photo_url} alt={item.caption || 'Foto portofolio'} fill sizes="(max-width: 640px) 50vw, 240px" className="object-cover" />

                    {/* Foto pertama itulah yang dilihat calon pelanggan lebih
                        dulu . katakan begitu, jangan biarkan mitra menebak
                        kenapa urutan penting. */}
                    {index === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded-md bg-brand-red px-1.5 py-0.5 text-[9px] font-bold text-white">
                        UTAMA
                      </span>
                    )}

                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <button
                        onClick={() => startEditCaption(item.id, item.caption)}
                        className="rounded-full bg-white p-2 text-brand-gray-700 transition-colors hover:bg-brand-gray-60"
                        aria-label="Ubah keterangan"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        className="rounded-full bg-white p-2 text-brand-error transition-colors hover:bg-brand-error-soft"
                        aria-label="Hapus"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    {item.caption && (
                      <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6 text-[11px] leading-snug text-white line-clamp-2">
                        {item.caption}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 p-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-brand-gray-450">#{index + 1}</span>
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveItem(index, -1)}
                          disabled={index === 0 || savingOrder}
                          className="rounded-md p-1.5 text-brand-gray-450 transition-colors hover:bg-brand-gray-60 hover:text-brand-gray-900 disabled:opacity-30"
                          aria-label={`Pindahkan foto ${index + 1} ke atas`}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === portfolios.length - 1 || savingOrder}
                          className="rounded-md p-1.5 text-brand-gray-450 transition-colors hover:bg-brand-gray-60 hover:text-brand-gray-900 disabled:opacity-30"
                          aria-label={`Pindahkan foto ${index + 1} ke bawah`}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Kaitan layanan: galeri campur membuat calon pelanggan
                        tidak bisa melihat contoh untuk layanan yang sedang ia
                        buka. Kosong = portofolio umum. */}
                    {services.length > 0 && (
                      <label className="block">
                        <span className="sr-only">Layanan terkait foto {index + 1}</span>
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3 shrink-0 text-brand-gray-450" aria-hidden />
                          <select
                            value={item.service_id ?? ''}
                            disabled={linkingId === item.id}
                            onChange={(e) => linkToService(item.id, e.target.value)}
                            className="w-full rounded-md border border-brand-gray-100 bg-white px-1.5 py-1 text-[11px] text-brand-gray-700 focus:border-brand-red focus:outline-none disabled:cursor-wait"
                          >
                            <option value="">Portofolio umum</option>
                            {services.map(svc => (
                              <option key={svc.id} value={svc.id}>{svc.name}</option>
                            ))}
                          </select>
                        </div>
                      </label>
                    )}
                  </div>
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
        </div>

        {portfolios.length === 0 && (
          <div className="text-center py-10">
            <ImageIcon className="w-12 h-12 text-brand-gray-100 mx-auto mb-3" />
            <p className="text-sm text-brand-gray-700">Belum ada foto portofolio.</p>
            <p className="text-xs text-brand-gray-450 mt-1">Tambahkan foto hasil kerja Anda untuk menarik lebih banyak pelanggan.</p>
          </div>
        )}
        </DataState>

        <MitraModal
          open={!!editingId}
          onClose={() => setEditingId(null)}
          title="Keterangan Foto"
          description="Jelaskan pekerjaan pada foto ini - pelanggan memakainya untuk menilai hasil kerjamu."
          footer={
            <>
              <Button variant="outline" className="flex-1 rounded-md" onClick={() => setEditingId(null)} disabled={savingCaption}>
                Batal
              </Button>
              <Button className="flex-1 rounded-md" onClick={saveCaption} isLoading={savingCaption}>
                Simpan
              </Button>
            </>
          }
        >
          <label htmlFor="caption-draft" className="sr-only">
            Keterangan foto
          </label>
          <textarea
            id="caption-draft"
            value={captionDraft}
            onChange={(e) => setCaptionDraft(e.target.value.slice(0, 255))}
            rows={3}
            maxLength={255}
            className="mt-3 w-full rounded-md border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
            placeholder="Contoh: Servis AC 1 PK, cuci evaporator + isi freon"
          />
          <p className="mt-1 text-right text-[11px] text-brand-gray-450">{captionDraft.length}/255</p>
        </MitraModal>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </MitraPageContainer>

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
