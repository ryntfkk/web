"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Plus, Trash2, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import { Button } from '@/components/ui/button';
import MitraModal from '@/components/mitra/MitraModal';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/skeleton';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useIsPartnerVerified } from '@/hooks/usePartnerVerificationStatus';
import { VerifiedLockBadge } from '@/components/mitra/VerifiedLockBadge';
import { getErrorMessage } from '@/types/api';

interface PartnerDocument {
  id: string;
  // P1 FIX (AUDIT #1): tipe verifikasi vendor kini bisa diupload mitra lewat
  // halaman ini setelah admin ubah tipe ke vendor. KTP & SELFIE_KTP tetap
  // lewat onboarding/resubmission saja.
  doc_type:
  | 'SKCK'
  | 'SKILL_CERTIFICATE'
  | 'BUSINESS_LICENSE'
  | 'OTHER'
  | 'AKTA_PENDIRIAN'
  | 'NPWP'
  | 'NIB';
  file_url: string;
  document_number?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  verified_by?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

const DOC_TYPE_LABELS: Record<PartnerDocument['doc_type'], string> = {
  SKCK: 'SKCK',
  SKILL_CERTIFICATE: 'Sertifikat Keahlian',
  BUSINESS_LICENSE: 'Izin Usaha',
  OTHER: 'Dokumen Lainnya',
  AKTA_PENDIRIAN: 'Akta Pendirian',
  NPWP: 'NPWP Badan Usaha',
  NIB: 'NIB',
};

const STATUS_VARIANTS: Record<PartnerDocument['status'], 'warning' | 'success' | 'error' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  EXPIRED: 'neutral',
};

const STATUS_LABELS: Record<PartnerDocument['status'], string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  EXPIRED: 'Kadaluarsa',
};

/**
 * Masa berlaku dokumen (P2). Sebelumnya tanggalnya hanya dicetak sebagai teks
 * abu-abu, jadi dokumen yang tinggal seminggu lagi terlihat persis sama dengan
 * yang masih setahun . mitra baru sadar setelah verifikasinya gugur.
 *
 * 30 hari dipakai sebagai ambang peringatan: cukup untuk mengurus perpanjangan
 * SKCK/izin tanpa membuat peringatan menyala sepanjang tahun.
 */
const EXPIRY_WARNING_DAYS = 30;

function expiryState(expiresAt?: string | null): { tone: 'expired' | 'soon' | 'ok'; days: number } | null {
  if (!expiresAt) return null;
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return null;
  const days = Math.ceil((ts - Date.now()) / 86_400_000);
  if (days < 0) return { tone: 'expired', days };
  if (days <= EXPIRY_WARNING_DAYS) return { tone: 'soon', days };
  return { tone: 'ok', days };
}

export default function MitraDocumentsPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const isVerified = useIsPartnerVerified(isAuthorized);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<PartnerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // P1 FIX (AUDIT #1): fetch partner_type untuk menentukan opsi dokumen vendor.
  const [isVendor, setIsVendor] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [docType, setDocType] = useState<PartnerDocument['doc_type']>('SKILL_CERTIFICATE');
  const [docNumber, setDocNumber] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    // Ambil partner_type sekaligus dengan dokumen . satu round-trip.
    const [docsRes, meRes] = await Promise.all([
      fetchAPI<PartnerDocument[]>('/partners/me/documents'),
      fetchAPI<{ partner_type?: string }>('/partners/me'),
    ]);
    if (docsRes.success && docsRes.data) {
      setDocuments(docsRes.data);
    } else {
      setError(getErrorMessage(docsRes) || 'Gagal memuat dokumen');
    }
    if (meRes.success && meRes.data?.partner_type === 'vendor') {
      setIsVendor(true);
    }
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isAuthorized) {
      fetchDocuments();
    }
  }, [isAuthorized, fetchDocuments]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran maksimal file 5MB');
      setSelectedFile(null);
      return;
    }

    if (!file.type.match(/^(image\/jpeg|image\/png|image\/jpg|application\/pdf)$/)) {
      setError('Format file harus JPG, PNG, atau PDF');
      setSelectedFile(null);
      return;
    }

    setError('');
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Pilih file terlebih dahulu');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const presignRes = await fetchAPI<{ upload_url: string; file_url: string }>(
        '/partners/me/documents/presigned-url',
        {
          method: 'POST',
          body: JSON.stringify({
            filename: selectedFile.name,
            content_type: selectedFile.type,
            file_size: selectedFile.size,
          }),
        },
      );

      if (!presignRes.success || !presignRes.data) {
        throw new Error(getErrorMessage(presignRes) || 'Gagal mendapatkan URL upload');
      }

      const uploadRes = await fetch(presignRes.data.upload_url, {
        method: 'PUT',
        body: selectedFile,
        headers: { 'Content-Type': selectedFile.type },
      });

      if (!uploadRes.ok) {
        throw new Error('Gagal mengupload file ke server');
      }

      const saveRes = await fetchAPI<PartnerDocument>('/partners/me/documents', {
        method: 'POST',
        body: JSON.stringify({
          doc_type: docType,
          file_url: presignRes.data.file_url,
          document_number: docNumber || undefined,
          expires_at: expiresAt || undefined,
        }),
      });

      if (!saveRes.success || !saveRes.data) {
        throw new Error(getErrorMessage(saveRes) || 'Gagal menyimpan dokumen');
      }

      setDocuments([saveRes.data, ...documents]);
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat upload');
    } finally {
      setUploading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setDocType('SKILL_CERTIFICATE');
    setDocNumber('');
    setExpiresAt('');
    setSelectedFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/partners/me/documents/${deleteId}`, { method: 'DELETE' });
    if (res.success) {
      setDocuments(documents.filter((d) => d.id !== deleteId));
    } else {
      setError(getErrorMessage(res) || 'Gagal menghapus dokumen');
    }
    setDeleteId(null);
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID');
  };

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-24">
      <MitraPageHeader
        title="Dokumen Pendukung"
        subtitle={isVendor ? 'SKCK, sertifikat, izin usaha, dan dokumen badan usaha' : 'SKCK, sertifikat, dan izin usaha'}
        variant="list"
        backHref="/mitra/profile"
        breadcrumbs={[{ label: 'Profil', href: '/mitra/profile' }, { label: 'Dokumen Pendukung' }]}
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="bg-brand-error-soft border border-brand-error-border text-brand-error p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-red hover:bg-brand-red-dark text-white rounded-md font-bold"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Dokumen
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 h-24 animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-brand-gray-100">
            <FileText className="w-12 h-12 text-brand-gray-100 mx-auto mb-3" />
            <p className="text-sm text-brand-gray-700">Belum ada dokumen pendukung.</p>
            <p className="text-xs text-brand-gray-450 mt-1 px-6">
              Unggah SKCK, sertifikat keahlian, atau izin usaha untuk meningkatkan kredibilitas.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-lg border border-brand-gray-100 p-4 flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-gray-60 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-brand-gray-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-brand-gray-900">{DOC_TYPE_LABELS[doc.doc_type]}</p>
                    <Badge variant={STATUS_VARIANTS[doc.status]}>{STATUS_LABELS[doc.status]}</Badge>
                    {doc.status === 'APPROVED' && <VerifiedLockBadge />}
                  </div>
                  {doc.document_number && (
                    <p className="text-xs text-brand-gray-700 mt-1">No: {doc.document_number}</p>
                  )}
                  {(() => {
                    const exp = expiryState(doc.expires_at);
                    if (!exp) return null;
                    if (exp.tone === 'ok') {
                      return (
                        <p className="text-xs text-brand-gray-450 mt-0.5">
                          Berlaku s/d: {formatDate(doc.expires_at!)}
                        </p>
                      );
                    }
                    return (
                      <p
                        className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${exp.tone === 'expired'
                            ? 'bg-brand-error-soft text-brand-error border border-brand-error-border'
                            : 'bg-brand-warning-soft text-brand-warning-dark border border-brand-warning-border'
                          }`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {exp.tone === 'expired'
                          ? `Kedaluwarsa ${formatDate(doc.expires_at!)} - perlu diperbarui`
                          : `Akan kedaluwarsa ${exp.days} hari lagi (${formatDate(doc.expires_at!)})`}
                      </p>
                    );
                  })()}
                  {doc.status === 'REJECTED' && doc.rejection_reason && (
                    <p className="text-xs text-brand-error mt-1">{doc.rejection_reason}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-brand-red hover:underline inline-flex items-center gap-1"
                    >
                      Lihat file <ExternalLink className="w-3 h-3" />
                    </a>
                    {doc.status !== 'APPROVED' && !isVerified && (
                      <button
                        onClick={() => setDeleteId(doc.id)}
                        className="text-xs font-medium text-brand-error hover:underline inline-flex items-center gap-1"
                        aria-label="Hapus dokumen"
                      >
                        <Trash2 className="w-3 h-3" /> Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={isModalOpen} onClose={closeModal} title="Tambah Dokumen">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-brand-gray-700 block mb-1.5">Jenis Dokumen</label>
            <select
              className="w-full bg-brand-gray-60 border border-brand-gray-200 rounded-lg px-4 py-3 text-brand-gray-800 focus:outline-none focus:border-brand-red"
              value={docType}
              onChange={(e) => setDocType(e.target.value as PartnerDocument['doc_type'])}
            >
              <option value="SKILL_CERTIFICATE">Sertifikat Keahlian</option>
              <option value="SKCK">SKCK</option>
              <option value="BUSINESS_LICENSE">Izin Usaha</option>
              <option value="OTHER">Dokumen Lainnya</option>
              {/* P1 FIX (AUDIT #1): opsi dokumen verifikasi vendor hanya
                  muncul bila mitra bertipe vendor. Individual tidak punya
                  badan usaha. */}
              {isVendor && (
                <>
                  <option value="AKTA_PENDIRIAN">Akta Pendirian</option>
                  <option value="NPWP">NPWP Badan Usaha</option>
                  <option value="NIB">NIB</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-brand-gray-700 block mb-1.5">
              Nomor Dokumen <span className="text-brand-gray-450 font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              className="w-full bg-brand-gray-60 border border-brand-gray-200 rounded-lg px-4 py-3 text-brand-gray-800 focus:outline-none focus:border-brand-red"
              placeholder="Contoh: NIB-123456789"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-brand-gray-700 block mb-1.5">
              Berlaku Sampai <span className="text-brand-gray-450 font-normal">(opsional)</span>
            </label>
            <input
              type="date"
              className="w-full bg-brand-gray-60 border border-brand-gray-200 rounded-lg px-4 py-3 text-brand-gray-800 focus:outline-none focus:border-brand-red"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-brand-gray-700 block mb-1.5">File</label>
            <div
              className="border-2 border-dashed border-brand-gray-200 rounded-lg p-4 text-center cursor-pointer hover:bg-brand-gray-60 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="w-6 h-6 text-brand-gray-400 mx-auto mb-2" />
              <span className="text-sm text-brand-gray-400">
                {selectedFile ? selectedFile.name : 'Pilih file JPG, PNG, atau PDF'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={uploading || !selectedFile}
            className="w-full bg-brand-red hover:bg-brand-red-dark rounded-md h-12 text-base font-bold"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Simpan Dokumen'
            )}
          </Button>
        </div>
      </Modal>

      <MitraModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Hapus Dokumen?"
        description="Dokumen akan dihapus dan harus diunggah ulang bila diperlukan."
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
