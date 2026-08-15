'use client';

/**
 * /mitra/kyc . wizard "KYC menyusul" (model mitra instan, PLAN-MITRA-INSTAN).
 *
 * Mitra lahir dari pendaftaran instan TANPA KTP/rekening. Halaman inilah jalur
 * self-serve untuk melengkapinya . syarat badge "Terverifikasi" + tarik dana:
 *
 *   GET  /partners/me/kyc  . status & daftar kekurangan (sumber kebenaran layar)
 *   POST /partners/me/kyc  . paket: NIK + foto KTP + swafoto (+ dokumen badan
 *                            usaha utk vendor) + rekening bank (+ bukti kategori
 *                            utk slot yang lahir tanpa bukti)
 *
 * HANYA untuk status pending. Rejected diarahkan ke pengajuan ulang
 * (/mitra/register?mode=reverify) . guard backend-nya memang memisahkan dua
 * jalur itu. Approved = layar "sudah terverifikasi".
 *
 * Nomor HP wajib terverifikasi lebih dulu (akun quick-register lahir tanpa
 * OTP): tanpa itu backend menolak INCOMPLETE_PROFILE, dan OTP penarikan pun
 * tak akan pernah bisa dikirim.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, IdCard, Phone, ShieldCheck, Wallet } from 'lucide-react';

import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuthStore } from '@/lib/store/authStore';
import { uploadFileToS3 } from '@/hooks/useUpload';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import MitraInfoBanner from '@/components/mitra/MitraInfoBanner';
import PhotoPickerBox, { type PhotoPickerItem } from '@/components/mitra/PhotoPickerBox';
import PhoneVerificationModal from '@/components/ui/PhoneVerificationModal';
import { PageSkeleton } from '@/components/ui/skeleton';
import { track } from '@/lib/analytics';

const INPUT_CLASS =
  'w-full rounded-md border border-brand-gray-100 bg-white px-3 py-2.5 text-sm text-brand-gray-900 placeholder:text-brand-gray-450 focus:outline-none focus:border-brand-red';
const LABEL_CLASS = 'mb-1.5 block text-sm font-semibold text-brand-gray-900';
const SECTION_CLASS = 'space-y-3 rounded-lg border border-brand-gray-100 bg-white p-4 sm:p-5';
const FILE_INPUT_CLASS =
  'w-full text-xs text-brand-gray-700 file:mr-2 file:rounded-md file:border-0 file:bg-brand-gray-60 file:px-3 file:py-2 file:text-xs file:font-semibold hover:file:bg-brand-gray-100';

const BANK_OPTIONS = ['BCA', 'MANDIRI', 'BNI', 'BRI', 'BSI'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_EVIDENCE_PHOTOS = 5;

interface KYCStatus {
  verification_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  partner_type: 'individual' | 'vendor';
  phone_verified: boolean;
  has_nik: boolean;
  has_ktp_photo: boolean;
  has_selfie: boolean;
  has_bank_account: boolean;
  vendor_docs_missing: string[];
  categories_missing_evidence: { category_id: string; category_name: string }[];
  can_submit: boolean;
}

const VENDOR_DOC_LABELS: Record<string, string> = {
  akta_url: 'Akta Pendirian',
  npwp_doc_url: 'Dokumen NPWP Badan',
  nib_doc_url: 'Dokumen NIB',
};

export default function KYCPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const { user } = useAuthStore();

  const [status, setStatus] = useState<KYCStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  // Gagal memuat ≠ memuat: tanpa pemisahan ini, error jaringan/404 membuat
  // halaman skeleton selamanya tanpa pesan maupun tombol coba lagi.
  const [statusError, setStatusError] = useState<string | null>(null);
  const [notPartner, setNotPartner] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const [ktpNumber, setKtpNumber] = useState('');
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [npwp, setNpwp] = useState('');
  const [vendorFiles, setVendorFiles] = useState<Record<string, File | null>>({});
  const [evidence, setEvidence] = useState<Record<string, File[]>>({});
  const [bank, setBank] = useState({ bank_code: '', bank_account_number: '', bank_account_name: '' });

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    const res = await fetchAPI<KYCStatus>('/partners/me/kyc');
    if (res.success && res.data) {
      setStatus(res.data);
      setNotPartner(false);
    } else if (res.status === 404) {
      setNotPartner(true);
    } else {
      setStatusError(getErrorMessage(res));
    }
    setStatusLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthorized) fetchStatus();
  }, [isAuthorized, fetchStatus]);

  // Pratinjau bukti kategori . pola memo+revoke standar (jangan bangun blob URL
  // di badan render).
  const evidenceUrlMap = useMemo(() => {
    const map: Record<string, PhotoPickerItem[]> = {};
    for (const [catId, files] of Object.entries(evidence)) {
      map[catId] = files.map((f) => ({ key: `${catId}-${f.name}-${f.size}-${f.lastModified}`, src: URL.createObjectURL(f) }));
    }
    return map;
  }, [evidence]);
  useEffect(
    () => () => {
      for (const items of Object.values(evidenceUrlMap)) {
        for (const item of items) URL.revokeObjectURL(item.src);
      }
    },
    [evidenceUrlMap],
  );

  const pickFile = (setter: (f: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_UPLOAD_BYTES) {
      setError('Ukuran file maksimal 5MB');
      return;
    }
    setError(null);
    setter(f);
  };

  const isVendor = status?.partner_type === 'vendor';
  const missingVendorDocs = status?.vendor_docs_missing ?? [];
  const missingEvidenceCats = status?.categories_missing_evidence ?? [];
  const phoneVerified = status?.phone_verified || user?.profile_complete === true;

  const validate = (): string | null => {
    if (!phoneVerified) return 'Verifikasi nomor HP dulu (langkah 1)';
    if (!/^\d{16}$/.test(ktpNumber.trim())) return 'NIK KTP harus tepat 16 digit angka';
    if (!ktpFile) return 'Foto KTP wajib diunggah';
    if (!selfieFile) return 'Swafoto memegang KTP wajib diunggah';
    for (const field of missingVendorDocs) {
      if (!vendorFiles[field]) return `${VENDOR_DOC_LABELS[field] ?? field} wajib diunggah`;
    }
    for (const cat of missingEvidenceCats) {
      if ((evidence[cat.category_id] ?? []).length === 0)
        return `Unggah minimal 1 foto alat & bahan untuk kategori ${cat.category_name}`;
    }
    if (!bank.bank_code || !bank.bank_account_number.trim() || !bank.bank_account_name.trim())
      return 'Rekening bank wajib lengkap . ke sanalah danamu dicairkan';
    return null;
  };

  const handleSubmit = async () => {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const ktpUrl = await uploadFileToS3(ktpFile!, 'ktp');
      const selfieUrl = await uploadFileToS3(selfieFile!, 'selfie');
      const vendorUrls: Record<string, string> = {};
      for (const field of missingVendorDocs) {
        vendorUrls[field] = await uploadFileToS3(vendorFiles[field]!, 'documents');
      }
      const categoryEvidence = [];
      for (const cat of missingEvidenceCats) {
        const urls: string[] = [];
        for (const f of evidence[cat.category_id] ?? []) {
          urls.push(await uploadFileToS3(f, 'category-evidence'));
        }
        categoryEvidence.push({ category_id: cat.category_id, evidence_urls: urls });
      }

      const res = await fetchAPI('/partners/me/kyc', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          ktp_number: ktpNumber.trim(),
          ktp_photo_url: ktpUrl,
          selfie_ktp_url: selfieUrl,
          ...(isVendor ? { npwp: npwp.trim(), ...vendorUrls } : {}),
          bank_code: bank.bank_code,
          bank_account_number: bank.bank_account_number.trim(),
          bank_account_name: bank.bank_account_name.trim(),
          category_evidence: categoryEvidence,
        }),
      });
      if (!res.success) throw new Error(getErrorMessage(res));
      track('partner_kyc_submitted');
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan. Coba lagi.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  const header = (
    <MitraPageHeader
      title="Verifikasi Identitas"
      variant="form"
      backHref="/mitra/profile"
      breadcrumbs={[{ label: 'Profil', href: '/mitra/profile' }, { label: 'Verifikasi' }]}
    />
  );

  if (statusLoading) {
    return (
      <div className="pb-6">
        {header}
        <MitraPageContainer variant="form">
          <PageSkeleton />
        </MitraPageContainer>
      </div>
    );
  }

  // Bukan mitra sama sekali (404 KYC_NOT_PARTNER) . beri jalan, jangan skeleton.
  if (notPartner) {
    return (
      <div className="pb-6">
        {header}
        <MitraPageContainer variant="form">
          <div className="rounded-lg border border-brand-gray-100 bg-white p-6 text-center">
            <h2 className="text-base font-bold text-brand-gray-900">Kamu Belum Terdaftar sebagai Mitra</h2>
            <p className="mt-2 text-sm text-brand-gray-700">
              Verifikasi identitas hanya untuk akun mitra. Daftar dulu . prosesnya singkat dan akunmu
              langsung aktif.
            </p>
            <Link
              href="/jadi-mitra/daftar"
              className="mt-4 inline-block rounded-md bg-brand-red px-6 py-3 text-sm font-bold text-white hover:bg-brand-red-dark"
            >
              Daftar Jadi Mitra
            </Link>
          </div>
        </MitraPageContainer>
      </div>
    );
  }

  if (statusError || !status) {
    return (
      <div className="pb-6">
        {header}
        <MitraPageContainer variant="form">
          <div className="rounded-lg border border-brand-error-border bg-brand-error-soft p-5 text-center">
            <p className="text-sm font-semibold text-brand-gray-900">Gagal memuat status verifikasi</p>
            {statusError && <p className="mt-1 text-xs text-brand-gray-700">{statusError}</p>}
            <button
              type="button"
              onClick={fetchStatus}
              className="mt-3 rounded-md border border-brand-red px-4 py-2 text-sm font-semibold text-brand-red hover:bg-brand-red-light"
            >
              Coba Lagi
            </button>
          </div>
        </MitraPageContainer>
      </div>
    );
  }

  // ── Sudah terverifikasi ──
  if (status.verification_status === 'approved') {
    return (
      <div className="pb-6">
        {header}
        <MitraPageContainer variant="form">
          <div className="rounded-lg border border-brand-gray-100 bg-white p-6 text-center">
            <BadgeCheck className="mx-auto h-12 w-12 text-brand-success" />
            <h2 className="mt-3 text-lg font-bold text-brand-gray-900">Akunmu Sudah Terverifikasi</h2>
            <p className="mt-2 text-sm text-brand-gray-700">
              Badge Terverifikasi tampil di profilmu dan penarikan dana terbuka. Data verifikasi kini
              terkunci . hubungi admin bila perlu mengubahnya.
            </p>
            <Link
              href="/mitra/wallet"
              className="mt-4 inline-block rounded-md bg-brand-red px-6 py-3 text-sm font-bold text-white hover:bg-brand-red-dark"
            >
              Buka Dompet
            </Link>
          </div>
        </MitraPageContainer>
      </div>
    );
  }

  // ── Ditolak → jalur pengajuan ulang ──
  if (status.verification_status === 'rejected') {
    return (
      <div className="pb-6">
        {header}
        <MitraPageContainer variant="form">
          <div className="rounded-lg border border-brand-error-border bg-brand-error-soft p-5">
            <h2 className="text-base font-bold text-brand-gray-900">Verifikasi Sebelumnya Ditolak</h2>
            {status.rejection_reason && (
              <p className="mt-2 text-sm text-brand-gray-700">Alasan: {status.rejection_reason}</p>
            )}
            <p className="mt-2 text-sm text-brand-gray-700">
              Akunmu tetap aktif menerima pesanan. Perbaiki datamu lewat pengajuan ulang untuk membuka
              penarikan dana.
            </p>
            <Link
              href="/mitra/register?mode=reverify"
              className="mt-4 inline-block rounded-md bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red-dark"
            >
              Ajukan Ulang
            </Link>
          </div>
        </MitraPageContainer>
      </div>
    );
  }

  // ── Sudah pernah submit paket lengkap, tinggal menunggu admin ──
  const alreadySubmitted =
    status.has_nik && status.has_ktp_photo && status.has_selfie && status.has_bank_account &&
    missingVendorDocs.length === 0 && missingEvidenceCats.length === 0;
  if (done || alreadySubmitted) {
    return (
      <div className="pb-6">
        {header}
        <MitraPageContainer variant="form">
          <div className="rounded-lg border border-brand-gray-100 bg-white p-6 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-brand-warning-dark" />
            <h2 className="mt-3 text-lg font-bold text-brand-gray-900">Verifikasi Sedang Ditinjau</h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-gray-700">
              Berkasmu sudah lengkap dan sedang ditinjau tim kami. Kamu tetap bisa menerima pesanan
              seperti biasa . begitu disetujui, badge Terverifikasi tampil di profilmu dan penarikan
              dana terbuka.
            </p>
            <Link
              href="/mitra/dashboard"
              className="mt-4 inline-block rounded-md bg-brand-red px-6 py-3 text-sm font-bold text-white hover:bg-brand-red-dark"
            >
              Kembali ke Dasbor
            </Link>
          </div>
        </MitraPageContainer>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {header}
      <MitraPageContainer variant="form">
        <p className="mb-4 text-sm leading-relaxed text-brand-gray-700">
          Satu kali verifikasi untuk badge <b>Terverifikasi</b> di profilmu dan membuka{' '}
          <b>penarikan dana</b>. Akunmu tetap aktif menerima pesanan selama proses ini.
        </p>

        {error && (
          <MitraInfoBanner variant="error" role="alert" className="mb-4">
            {error}
          </MitraInfoBanner>
        )}

        <div className="space-y-4">
          {/* ── 1. Nomor HP ── */}
          <section className={SECTION_CLASS}>
            <h2 className="flex items-center gap-2 text-base font-bold text-brand-gray-900">
              <Phone className="h-4 w-4 shrink-0 text-brand-red" /> 1. Nomor HP Terverifikasi
            </h2>
            {phoneVerified ? (
              <p className="text-sm text-brand-success">✓ Nomor HP-mu sudah terverifikasi.</p>
            ) : (
              <>
                <p className="text-sm text-brand-gray-700">
                  OTP penarikan dana dikirim ke nomor ini, jadi ia harus terbukti milikmu.
                </p>
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(true)}
                  className="rounded-md border border-brand-red px-4 py-2 text-sm font-semibold text-brand-red hover:bg-brand-red-light"
                >
                  Verifikasi Nomor HP
                </button>
              </>
            )}
          </section>

          {/* ── 2. Identitas ── */}
          <section className={SECTION_CLASS}>
            <h2 className="flex items-center gap-2 text-base font-bold text-brand-gray-900">
              <IdCard className="h-4 w-4 shrink-0 text-brand-red" /> 2. Identitas {isVendor ? 'PIC ' : ''}(KTP)
            </h2>
            <div>
              <label htmlFor="kyc-nik" className={LABEL_CLASS}>NIK KTP *</label>
              <input id="kyc-nik" className={INPUT_CLASS} inputMode="numeric" maxLength={16}
                value={ktpNumber} placeholder="16 digit"
                onChange={(e) => setKtpNumber(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="kyc-ktp" className={LABEL_CLASS}>Foto KTP *</label>
                <input id="kyc-ktp" type="file" accept="image/jpeg,image/png,image/jpg,image/webp"
                  className={FILE_INPUT_CLASS} onChange={pickFile(setKtpFile)} />
                {ktpFile && <p className="mt-1 truncate text-xs text-brand-gray-450">{ktpFile.name}</p>}
              </div>
              <div>
                <label htmlFor="kyc-selfie" className={LABEL_CLASS}>Swafoto memegang KTP *</label>
                <input id="kyc-selfie" type="file" accept="image/jpeg,image/png,image/jpg,image/webp"
                  className={FILE_INPUT_CLASS} onChange={pickFile(setSelfieFile)} />
                {selfieFile && <p className="mt-1 truncate text-xs text-brand-gray-450">{selfieFile.name}</p>}
              </div>
            </div>
          </section>

          {/* ── 3. Dokumen badan usaha (vendor, hanya yang belum ada) ── */}
          {isVendor && missingVendorDocs.length > 0 && (
            <section className={SECTION_CLASS}>
              <h2 className="flex items-center gap-2 text-base font-bold text-brand-gray-900">
                <ShieldCheck className="h-4 w-4 shrink-0 text-brand-red" /> 3. Dokumen Badan Usaha
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {missingVendorDocs.map((field) => (
                  <div key={field}>
                    <label htmlFor={`kyc-doc-${field}`} className={LABEL_CLASS}>
                      {VENDOR_DOC_LABELS[field] ?? field} *
                    </label>
                    <input id={`kyc-doc-${field}`} type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                      className={FILE_INPUT_CLASS}
                      onChange={pickFile((f) => setVendorFiles((v) => ({ ...v, [field]: f })))} />
                    {vendorFiles[field] && (
                      <p className="mt-1 truncate text-xs text-brand-gray-450">{vendorFiles[field]!.name}</p>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <label htmlFor="kyc-npwp" className={LABEL_CLASS}>NPWP badan (opsional)</label>
                <input id="kyc-npwp" className={INPUT_CLASS} value={npwp}
                  onChange={(e) => setNpwp(e.target.value)} />
              </div>
            </section>
          )}

          {/* ── Bukti kategori (hanya slot yang lahir tanpa bukti) ── */}
          {missingEvidenceCats.length > 0 && (
            <section className={SECTION_CLASS}>
              <h2 className="flex items-center gap-2 text-base font-bold text-brand-gray-900">
                <ShieldCheck className="h-4 w-4 shrink-0 text-brand-red" /> Bukti Keahlian per Kategori
              </h2>
              {missingEvidenceCats.map((cat) => (
                <div key={cat.category_id}>
                  <span className={LABEL_CLASS}>Foto alat &amp; bahan . {cat.category_name} *</span>
                  <PhotoPickerBox
                    id={`kyc-evidence-${cat.category_id}`}
                    items={evidenceUrlMap[cat.category_id] ?? []}
                    max={MAX_EVIDENCE_PHOTOS}
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    onPick={(picked) => {
                      if (!picked) return;
                      const files = Array.from(picked).filter((f) => f.size <= MAX_UPLOAD_BYTES);
                      setEvidence((ev) => ({
                        ...ev,
                        [cat.category_id]: [...(ev[cat.category_id] ?? []), ...files].slice(0, MAX_EVIDENCE_PHOTOS),
                      }));
                    }}
                    onRemove={(i) =>
                      setEvidence((ev) => ({
                        ...ev,
                        [cat.category_id]: (ev[cat.category_id] ?? []).filter((_, idx) => idx !== i),
                      }))
                    }
                  />
                </div>
              ))}
            </section>
          )}

          {/* ── Rekening pencairan ── */}
          <section className={SECTION_CLASS}>
            <h2 className="flex items-center gap-2 text-base font-bold text-brand-gray-900">
              <Wallet className="h-4 w-4 shrink-0 text-brand-red" /> Rekening Pencairan
            </h2>
            {isVendor && (
              <MitraInfoBanner variant="warning">
                Rekening wajib <b>atas nama badan usaha</b>, bukan rekening pribadi PIC. Nama yang
                tidak cocok akan ditolak.
              </MitraInfoBanner>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="kyc-bank" className={LABEL_CLASS}>Bank *</label>
                <select id="kyc-bank" className={INPUT_CLASS} value={bank.bank_code}
                  onChange={(e) => setBank({ ...bank, bank_code: e.target.value })}>
                  <option value="">Pilih bank</option>
                  {BANK_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="kyc-accno" className={LABEL_CLASS}>Nomor rekening *</label>
                <input id="kyc-accno" className={INPUT_CLASS} inputMode="numeric" value={bank.bank_account_number}
                  onChange={(e) => setBank({ ...bank, bank_account_number: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div>
                <label htmlFor="kyc-accname" className={LABEL_CLASS}>Atas nama *</label>
                <input id="kyc-accname" className={INPUT_CLASS} value={bank.bank_account_name}
                  onChange={(e) => setBank({ ...bank, bank_account_name: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-brand-gray-450">
              Setelah verifikasi disetujui, rekening terkunci demi keamanan dana . perubahan
              berikutnya lewat admin.
            </p>
          </section>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="h-12 w-full rounded-md bg-brand-red text-base font-bold text-white transition-colors hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Mengirim…' : 'Kirim Verifikasi'}
          </button>
        </div>
      </MitraPageContainer>

      <PhoneVerificationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={() => {
          setShowPhoneModal(false);
          fetchStatus();
        }}
      />
    </div>
  );
}
