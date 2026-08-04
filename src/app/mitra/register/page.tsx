"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Building2, ChevronLeft, CheckCircle, Upload, User } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { PageSkeleton } from '@/components/ui/skeleton';
import RegionSelect from '@/components/ui/RegionSelect';
import PhoneVerificationModal from '@/components/ui/PhoneVerificationModal';
import { useAuthStore } from '@/lib/store/authStore';
import LegalConsentCheckbox from '@/components/auth/LegalConsentCheckbox';
import { useActiveLegalDocuments } from '@/hooks/useLegalConsent';
import { usePlatformConfig, formatFeeRate } from '@/hooks/usePlatformConfig';
import { formatPrice } from '@/lib/format';
import dynamic from 'next/dynamic';
// Leaflet CSS kini di-import global di app/globals.css (lihat catatan di sana).

type PartnerType = 'individual' | 'vendor';

/**
 * Bentuk badan usaha — cerminan enum `business_entity_form` (migrasi 000063)
 * dan `validEntityForms` di `internal/partner/dto.go`. Kalau backend menambah
 * bentuk baru, daftar ini ikut; nilai di luar daftar ditolak server.
 */
const ENTITY_FORMS: { value: string; label: string }[] = [
  { value: 'PT', label: 'PT (Perseroan Terbatas)' },
  { value: 'CV', label: 'CV (Commanditaire Vennootschap)' },
  { value: 'UD', label: 'UD (Usaha Dagang)' },
  { value: 'FIRMA', label: 'Firma' },
  { value: 'KOPERASI', label: 'Koperasi' },
  { value: 'YAYASAN', label: 'Yayasan' },
  { value: 'PERKUMPULAN', label: 'Perkumpulan' },
];

/** Bentuk respons GET /partners/me/resubmission (ResubmissionDraftResponse). */
interface ResubmissionDraft {
  can_resubmit: boolean;
  verification_status: string;
  rejection_reason?: string;
  ktp_number_masked: string;
  ktp_photo_url: string;
  selfie_ktp_url: string;
  bio: string;
  service_area: string[];
  city: string;
  district: string;
  province: string;
  address_detail: string;
  basecamp_lat: number;
  basecamp_lon: number;
  bank_code: string;
  bank_account_name: string;
  bank_account_number_masked: string;
  partner_type: string;
  display_name?: string;
  legal_entity_name?: string;
  entity_form?: string;
  npwp_masked?: string;
  nib?: string;
  pic_name?: string;
  pic_position?: string;
  business_phone?: string;
  business_email?: string;
  documents?: { doc_type: string; file_url: string; status: string; rejection_reason?: string }[];
}

// Dynamically import Map component to avoid SSR issues with Leaflet
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

const INPUT_CLASS =
  'w-full bg-brand-gray-60 border border-brand-gray-200 rounded-md px-4 py-3 text-brand-gray-800 focus:outline-none focus:border-brand-red';
const LABEL_CLASS = 'text-sm font-medium text-brand-gray-700 block mb-1';

/** Kunci tiap langkah. Urutannya ditentukan `stepsFor()`, bukan angka mentah. */
type StepKey =
  | 'type'
  | 'business'
  | 'business_docs'
  | 'identity'
  | 'personal_docs'
  | 'profile'
  | 'location'
  | 'bank';

/**
 * Urutan langkah bergantung tipe mitra (V3).
 *
 * `type` hanya ada saat PENDAFTARAN BARU. Pada verifikasi ulang tipe mitra tidak
 * boleh berubah — mengubahnya berarti mengganti subjek hukum kontrak, dan
 * backend memang tidak menerima `partner_type` di endpoint resubmission.
 *
 * Data badan usaha datang LEBIH DULU daripada identitas PIC supaya jelas bahwa
 * KTP yang diminta berikutnya adalah KTP penanggung jawab, bukan "KTP
 * perusahaan" yang tidak pernah ada.
 */
function stepsFor(type: PartnerType, isReverify: boolean): StepKey[] {
  const base: StepKey[] = isReverify ? [] : ['type'];
  if (type === 'vendor') {
    return [...base, 'business', 'business_docs', 'identity', 'personal_docs', 'profile', 'location', 'bank'];
  }
  return [...base, 'identity', 'personal_docs', 'profile', 'location', 'bank'];
}

/**
 * Kotak unggah berkas — dipakai KTP maupun dokumen badan usaha.
 *
 * Dideklarasikan di lingkup MODUL, bukan di dalam komponen form. Komponen yang
 * dibuat ulang tiap render menghasilkan elemen `<input type="file">` yang baru
 * pula, dan berkas yang sudah dipilih pengguna ikut hilang setiap kali ada
 * ketikan di field mana pun.
 */
function FilePicker({
  id,
  label,
  hint,
  file,
  existingUrl,
  accept,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  file: File | null;
  existingUrl?: string;
  accept: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      {hint && <p className="mb-1 text-xs text-brand-gray-450">{hint}</p>}
      <label
        htmlFor={id}
        className="block cursor-pointer rounded-md border-2 border-dashed border-brand-gray-200 p-4 text-center transition-colors hover:bg-brand-gray-60"
      >
        <Upload className="mx-auto mb-2 h-6 w-6 text-brand-gray-400" />
        <span className="text-sm text-brand-gray-400">
          {file ? file.name : existingUrl ? 'Berkas lama dipakai — klik untuk mengganti' : `Pilih ${label}`}
        </span>
      </label>
      <input id={id} type="file" className="hidden" accept={accept} onChange={onChange} />
    </div>
  );
}

function MitraRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReverify = searchParams?.get('mode') === 'reverify';
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { data: legalDocs } = useActiveLegalDocuments();
  const platformConfig = usePlatformConfig();
  const user = useAuthStore((s) => s.user);
  // Server menolak onboarding tanpa nomor terverifikasi. Tampilkan syaratnya di
  // depan, bukan sebagai error setelah lima langkah form dan dua unggahan KTP.
  const needsPhone = !!user && !user.profile_complete;

  const [partnerType, setPartnerType] = useState<PartnerType>('individual');

  // Form State
  const [formData, setFormData] = useState({
    ktp_number: '',
    ktp_photo: null as File | null,
    selfie_ktp: null as File | null,
    bio: '',
    service_area: ['general'], // Diisi otomatis dari kota+kecamatan saat submit
    province: '',
    city: '',
    district: '',
    address_detail: '',
    basecamp_lat: -6.200000,
    basecamp_lon: 106.816666,
    bank_code: '',
    bank_account_number: '',
    bank_account_name: '',
  });

  // Data badan usaha — dipisah dari formData supaya mudah dipastikan TIDAK
  // ikut terkirim saat tipe perorangan (backend menolak field ini bila terisi).
  const [vendor, setVendor] = useState({
    display_name: '',
    legal_entity_name: '',
    entity_form: '',
    npwp: '',
    nib: '',
    pic_name: '',
    pic_position: '',
    business_phone: '',
    business_email: '',
    akta: null as File | null,
    npwp_doc: null as File | null,
    nib_doc: null as File | null,
  });

  // Verifikasi ulang: URL berkas yang SUDAH ada. Mitra boleh mempertahankannya —
  // memaksa unggah ulang KTP hanya karena alamat basecamp ditolak itu menyiksa.
  const [existingPhotos, setExistingPhotos] = useState({ ktp_photo_url: '', selfie_ktp_url: '' });
  const [existingDocs, setExistingDocs] = useState({ akta_url: '', npwp_doc_url: '', nib_doc_url: '' });
  const [rejectionReason, setRejectionReason] = useState('');
  const [maskedHints, setMaskedHints] = useState({ ktp: '', bank: '', npwp: '' });

  const steps = stepsFor(partnerType, !!isReverify);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex >= steps.length - 1;

  const nextStep = () => setStepIndex((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStepIndex((s) => Math.max(s - 1, 0));

  // Prefill dari endpoint draft khusus (P0-05). Dulu membaca /partners/me dan
  // mengharapkan `ktp_number` + data rekening ada di sana — dua-duanya tidak
  // pernah ada di DTO itu, jadi form selalu kosong tanpa penjelasan.
  useEffect(() => {
    if (!isReverify) return;
    fetchAPI<ResubmissionDraft>('/partners/me/resubmission').then((res) => {
      if (!res.success || !res.data) return;
      const d = res.data;
      // Tipe mitra datang dari SERVER pada verifikasi ulang; pemohon tidak
      // memilihnya lagi.
      if (d.partner_type === 'vendor') setPartnerType('vendor');
      setFormData((prev) => ({
        ...prev,
        bio: d.bio || '',
        province: d.province || '',
        city: d.city || '',
        district: d.district || '',
        address_detail: d.address_detail || '',
        basecamp_lat: d.basecamp_lat || prev.basecamp_lat,
        basecamp_lon: d.basecamp_lon || prev.basecamp_lon,
        bank_code: d.bank_code || '',
        bank_account_name: d.bank_account_name || '',
      }));
      setVendor((prev) => ({
        ...prev,
        display_name: d.display_name || '',
        legal_entity_name: d.legal_entity_name || '',
        entity_form: (d.entity_form || '').toUpperCase(),
        nib: d.nib || '',
        pic_name: d.pic_name || '',
        pic_position: d.pic_position || '',
        business_phone: d.business_phone || '',
        business_email: d.business_email || '',
      }));
      setExistingPhotos({
        ktp_photo_url: d.ktp_photo_url || '',
        selfie_ktp_url: d.selfie_ktp_url || '',
      });
      // Dokumen badan usaha yang sudah tersimpan boleh dipertahankan, sama
      // seperti foto KTP — kecuali yang memang ditolak admin.
      const byType = (t: string) => d.documents?.find((doc) => doc.doc_type?.toUpperCase() === t);
      setExistingDocs({
        akta_url: byType('AKTA')?.file_url || '',
        npwp_doc_url: byType('NPWP')?.file_url || '',
        nib_doc_url: byType('NIB')?.file_url || '',
      });
      setRejectionReason(d.rejection_reason || '');
      setMaskedHints({
        ktp: d.ktp_number_masked || '',
        bank: d.bank_account_number_masked || '',
        npwp: d.npwp_masked || '',
      });
    });
  }, [isReverify]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, [field]: e.target.files[0] });
    }
  };

  const handleVendorFile = (e: React.ChangeEvent<HTMLInputElement>, field: 'akta' | 'npwp_doc' | 'nib_doc') => {
    if (e.target.files && e.target.files[0]) {
      setVendor((prev) => ({ ...prev, [field]: e.target.files![0] }));
    }
  };

  const uploadFileToS3 = async (file: File) => {
    // 1. Get presigned URL
    const { success, data } = await fetchAPI<{ upload_url: string; file_url: string }>(
      '/partners/upload/presigned-url',
      {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, content_type: file.type }),
        credentials: 'include',
      },
    );

    if (!success || !data) throw new Error('Failed to get presigned URL');

    // 2. Upload to S3
    const uploadRes = await fetch(data.upload_url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    if (!uploadRes.ok) throw new Error('Failed to upload file');

    // 3. Return final URL
    return data.file_url;
  };

  const isVendor = partnerType === 'vendor';

  // Syarat lolos tiap langkah — dicerminkan dari validasi backend
  // (`validatePartnerTypeFields`) supaya pemohon tidak menyelesaikan delapan
  // langkah lalu ditolak karena NIB kurang satu digit.
  // NPWP boleh DIBIARKAN KOSONG saat verifikasi ulang: backend memperlakukan
  // kosong sebagai "pertahankan yang lama" supaya mitra tidak dipaksa mengetik
  // ulang nomor pajaknya hanya karena alamat basecamp-nya ditolak. NIB tidak
  // ikut aturan itu — kosong justru MENGHAPUS nilai lamanya.
  const npwpValid = isReverify
    ? vendor.npwp.length === 0 || (vendor.npwp.length >= 15 && vendor.npwp.length <= 16)
    : vendor.npwp.length >= 15 && vendor.npwp.length <= 16;

  const businessValid =
    vendor.display_name.trim().length >= 3 &&
    vendor.legal_entity_name.trim() !== '' &&
    vendor.entity_form !== '' &&
    vendor.pic_name.trim() !== '' &&
    npwpValid &&
    vendor.nib.length === 13;

  const businessDocsValid =
    (!!vendor.akta || !!existingDocs.akta_url) &&
    (!!vendor.npwp_doc || !!existingDocs.npwp_doc_url) &&
    (!!vendor.nib_doc || !!existingDocs.nib_doc_url);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Verifikasi ulang boleh mempertahankan foto lama; pendaftaran baru wajib
      // mengunggah keduanya.
      if (!isReverify && (!formData.ktp_photo || !formData.selfie_ktp)) {
        throw new Error('Mohon lengkapi foto KTP dan Selfie');
      }

      const ktpUrl = formData.ktp_photo
        ? await uploadFileToS3(formData.ktp_photo)
        : existingPhotos.ktp_photo_url;
      const selfieUrl = formData.selfie_ktp
        ? await uploadFileToS3(formData.selfie_ktp)
        : existingPhotos.selfie_ktp_url;

      if (!ktpUrl || !selfieUrl) throw new Error('Mohon lengkapi foto KTP dan Selfie');

      let vendorFields = {};
      if (isVendor) {
        const aktaUrl = vendor.akta ? await uploadFileToS3(vendor.akta) : existingDocs.akta_url;
        const npwpDocUrl = vendor.npwp_doc ? await uploadFileToS3(vendor.npwp_doc) : existingDocs.npwp_doc_url;
        const nibDocUrl = vendor.nib_doc ? await uploadFileToS3(vendor.nib_doc) : existingDocs.nib_doc_url;
        if (!aktaUrl || !npwpDocUrl || !nibDocUrl) {
          throw new Error('Mohon lengkapi akta pendirian, NPWP badan usaha, dan NIB');
        }
        vendorFields = {
          display_name: vendor.display_name.trim(),
          legal_entity_name: vendor.legal_entity_name.trim(),
          entity_form: vendor.entity_form,
          npwp: vendor.npwp,
          nib: vendor.nib,
          pic_name: vendor.pic_name.trim(),
          pic_position: vendor.pic_position.trim(),
          business_phone: vendor.business_phone.trim(),
          business_email: vendor.business_email.trim(),
          akta_url: aktaUrl,
          npwp_doc_url: npwpDocUrl,
          nib_doc_url: nibDocUrl,
        };
      }

      // Persetujuan legal ikut DI DALAM perintah pengajuan (P0-06). Dulu dicatat
      // lewat panggilan kedua setelah pengajuan sukses: bila panggilan itu gagal,
      // mitra terlanjur ada tanpa bukti persetujuan dan tidak bisa mengulang.
      const legalDocumentIds = (legalDocs || [])
        .filter((d) => d.slug === 'terms' || d.slug === 'privacy')
        .map((d) => d.id);

      const payload = {
        ktp_number: formData.ktp_number,
        ktp_photo_url: ktpUrl,
        selfie_ktp_url: selfieUrl,
        bio: formData.bio,
        service_area: [[formData.district, formData.city].filter(Boolean).join(', ') || 'general'],
        province: formData.province,
        city: formData.city,
        district: formData.district,
        address_detail: formData.address_detail,
        basecamp_lat: formData.basecamp_lat,
        basecamp_lon: formData.basecamp_lon,
        bank_code: formData.bank_code,
        bank_account_number: formData.bank_account_number,
        bank_account_name: formData.bank_account_name,
        legal_document_ids: legalDocumentIds,
        // `partner_type` HANYA di pendaftaran baru. Endpoint resubmission tidak
        // menerimanya: tipe mitra = subjek hukum kontrak, dan menggantinya
        // sendiri lewat verifikasi ulang berarti mengganti pihak yang terikat.
        ...(isReverify ? {} : { partner_type: partnerType }),
        // Field badan usaha hanya ikut untuk vendor. Mengirimnya sebagai string
        // kosong untuk perorangan pun DITOLAK server — dan memang seharusnya:
        // itu mencegah data badan usaha nyangkut di akun perorangan.
        ...vendorFields,
      };

      // Pengajuan ulang TIDAK boleh lewat /partners/onboarding: endpoint itu
      // menolak user yang sudah punya baris partner (P0-04).
      const res = isReverify
        ? await fetchAPI('/partners/me/resubmission', {
            method: 'PUT',
            body: JSON.stringify(payload),
            credentials: 'include',
          })
        : await fetchAPI('/partners/onboarding', {
            method: 'POST',
            body: JSON.stringify(payload),
            credentials: 'include',
          });

      if (!res.success) {
        throw new Error(res.message || (typeof res.error === 'string' ? res.error : 'Gagal mengirim form'));
      }

      router.push('/mitra/verification-status');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-h bg-brand-gray-60 flex flex-col">
      <div className="bg-white px-4 py-3 flex items-center border-b border-brand-gray-100 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => (stepIndex > 0 ? prevStep() : router.back())}
          className="p-2 -ml-2 text-brand-gray-400"
          aria-label="Sebelumnya"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-brand-gray-800 font-bold text-lg flex-1 text-center pr-8">
          {isReverify ? 'Verifikasi Ulang' : 'Pendaftaran Mitra'}
        </h1>
      </div>

      <div className="flex-1 p-4 max-w-md w-full mx-auto">
        {needsPhone && (
          <div className="mb-4 bg-brand-warning-soft border border-brand-warning-border rounded-md p-4">
            <p className="text-sm font-semibold text-brand-gray-900">Verifikasi nomor HP dulu</p>
            <p className="text-xs text-brand-gray-700 mt-0.5">
              Pendaftaran mitra butuh nomor WhatsApp terverifikasi — pelanggan dan tim kami
              menghubungi kamu lewat nomor itu.
            </p>
            <button
              type="button"
              onClick={() => setShowPhoneModal(true)}
              className="mt-2 text-xs font-bold text-brand-red hover:underline"
            >
              Verifikasi Sekarang
            </button>
          </div>
        )}

        {isReverify && rejectionReason && (
          <div className="mb-4 bg-brand-error-soft border border-brand-error-border rounded-md p-4">
            <p className="text-sm font-semibold text-brand-gray-900">Alasan penolakan sebelumnya</p>
            <p className="text-xs text-brand-gray-700 mt-1 whitespace-pre-line">{rejectionReason}</p>
            <p className="text-xs text-brand-gray-450 mt-2">
              Perbaiki bagian tersebut, lalu kirim ulang. Data yang tidak bermasalah sudah kami isikan.
            </p>
          </div>
        )}

        <PhoneVerificationModal
          isOpen={showPhoneModal}
          onClose={() => setShowPhoneModal(false)}
          onSuccess={() => setShowPhoneModal(false)}
        />

        <div className="flex justify-between items-center mb-6 px-2 relative">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-brand-gray-100 -z-10"></div>
          {steps.map((key, i) => (
            <div
              key={key}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                stepIndex >= i ? 'bg-brand-red text-white' : 'bg-white text-brand-gray-200 border border-brand-gray-200'
              }`}
            >
              {stepIndex > i ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-brand-error-soft text-brand-red text-sm rounded-md border border-brand-error-border">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg p-5 shadow-sm border border-brand-gray-100">
          {currentStep === 'type' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-brand-gray-800">Daftar sebagai</h2>
              <p className="text-sm text-brand-gray-450">
                Pilihan ini menentukan siapa yang terikat kontrak dan atas nama siapa pembayaran
                diterima. <strong>Tidak bisa diubah sendiri</strong> setelah pengajuan dikirim.
              </p>

              {(
                [
                  {
                    value: 'individual' as PartnerType,
                    icon: User,
                    title: 'Perorangan',
                    desc: 'Kamu bekerja atas nama diri sendiri. Pembayaran masuk ke rekening pribadimu.',
                  },
                  {
                    value: 'vendor' as PartnerType,
                    icon: Building2,
                    title: 'Badan Usaha',
                    desc: 'PT, CV, UD, dan sejenisnya. Butuh akta, NPWP badan, dan NIB. Rekening pencairan harus atas nama badan usaha.',
                  },
                ]
              ).map((opt) => {
                const Icon = opt.icon;
                const selected = partnerType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setPartnerType(opt.value)}
                    className={`flex w-full items-start gap-3 rounded-md border p-4 text-left transition-colors ${
                      selected
                        ? 'border-brand-red bg-brand-error-soft'
                        : 'border-brand-gray-200 bg-white hover:border-brand-gray-400'
                    }`}
                  >
                    <Icon
                      className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? 'text-brand-red' : 'text-brand-gray-450'}`}
                      aria-hidden
                    />
                    <span>
                      <span className="block text-sm font-bold text-brand-gray-900">{opt.title}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-brand-gray-700">{opt.desc}</span>
                    </span>
                  </button>
                );
              })}

              <Button className="w-full mt-4" onClick={nextStep}>
                Selanjutnya
              </Button>
            </div>
          )}

          {currentStep === 'business' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-brand-gray-800">Data Badan Usaha</h2>

              <div>
                <label htmlFor="display_name" className={LABEL_CLASS}>
                  Nama Tampil
                </label>
                <p className="mb-1 text-xs text-brand-gray-450">Nama yang dilihat pelanggan. Minimal 3 karakter.</p>
                <input
                  id="display_name"
                  type="text"
                  maxLength={255}
                  className={INPUT_CLASS}
                  placeholder="Contoh: Sejahtera Teknik"
                  value={vendor.display_name}
                  onChange={(e) => setVendor({ ...vendor, display_name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="legal_entity_name" className={LABEL_CLASS}>
                  Nama Badan Hukum
                </label>
                <p className="mb-1 text-xs text-brand-gray-450">
                  Sesuai akta. Inilah pihak yang menerima pembayaran, dan pelanggan berhak melihatnya.
                </p>
                <input
                  id="legal_entity_name"
                  type="text"
                  className={INPUT_CLASS}
                  placeholder="Contoh: PT Sejahtera Teknik Nusantara"
                  value={vendor.legal_entity_name}
                  onChange={(e) => setVendor({ ...vendor, legal_entity_name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="entity_form" className={LABEL_CLASS}>
                  Bentuk Badan Usaha
                </label>
                <select
                  id="entity_form"
                  className={INPUT_CLASS}
                  value={vendor.entity_form}
                  onChange={(e) => setVendor({ ...vendor, entity_form: e.target.value })}
                >
                  <option value="">Pilih bentuk badan usaha</option>
                  {ENTITY_FORMS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="npwp" className={LABEL_CLASS}>
                  NPWP Badan Usaha
                </label>
                <input
                  id="npwp"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  className={INPUT_CLASS}
                  placeholder={isReverify ? 'Kosongkan bila tidak berubah' : '15 atau 16 digit, tanpa titik/strip'}
                  value={vendor.npwp}
                  onChange={(e) => setVendor({ ...vendor, npwp: e.target.value.replace(/\D/g, '') })}
                />
                {isReverify && maskedHints.npwp && (
                  <p className="mt-1 text-xs text-brand-gray-450">
                    NPWP sudah tersimpan. Biarkan kosong bila tidak berubah — isi hanya kalau perlu diperbaiki.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="nib" className={LABEL_CLASS}>
                  NIB (Nomor Induk Berusaha)
                </label>
                <input
                  id="nib"
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  className={INPUT_CLASS}
                  placeholder="13 digit dari OSS"
                  value={vendor.nib}
                  onChange={(e) => setVendor({ ...vendor, nib: e.target.value.replace(/\D/g, '') })}
                />
              </div>

              <div>
                <label htmlFor="pic_name" className={LABEL_CLASS}>
                  Nama Penanggung Jawab (PIC)
                </label>
                <p className="mb-1 text-xs text-brand-gray-450">
                  Orang yang memegang akun ini dan menandatangani ketentuan atas nama badan usaha.
                </p>
                <input
                  id="pic_name"
                  type="text"
                  className={INPUT_CLASS}
                  placeholder="Nama lengkap sesuai KTP"
                  value={vendor.pic_name}
                  onChange={(e) => setVendor({ ...vendor, pic_name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="pic_position" className={LABEL_CLASS}>
                  Jabatan PIC <span className="font-normal text-brand-gray-450">(opsional)</span>
                </label>
                <input
                  id="pic_position"
                  type="text"
                  className={INPUT_CLASS}
                  placeholder="Contoh: Direktur"
                  value={vendor.pic_position}
                  onChange={(e) => setVendor({ ...vendor, pic_position: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="business_phone" className={LABEL_CLASS}>
                  Telepon Kantor <span className="font-normal text-brand-gray-450">(opsional)</span>
                </label>
                <input
                  id="business_phone"
                  type="tel"
                  className={INPUT_CLASS}
                  placeholder="Contoh: 0215551234"
                  value={vendor.business_phone}
                  onChange={(e) => setVendor({ ...vendor, business_phone: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="business_email" className={LABEL_CLASS}>
                  Email Kantor <span className="font-normal text-brand-gray-450">(opsional)</span>
                </label>
                <input
                  id="business_email"
                  type="email"
                  className={INPUT_CLASS}
                  placeholder="nama@perusahaan.co.id"
                  value={vendor.business_email}
                  onChange={(e) => setVendor({ ...vendor, business_email: e.target.value })}
                />
              </div>

              <Button className="w-full mt-4" onClick={nextStep} disabled={!businessValid}>
                Selanjutnya
              </Button>
            </div>
          )}

          {currentStep === 'business_docs' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-brand-gray-800">Dokumen Badan Usaha</h2>
              <p className="text-sm text-brand-gray-450">
                Ketiganya wajib. Tim kami mencocokkan NPWP dan NIB yang kamu ketik dengan dokumennya —
                pastikan terbaca jelas.
              </p>

              <FilePicker
                id="akta"
                label="Akta Pendirian"
                hint="Akta pendirian beserta perubahan terakhir (bila ada). PDF atau foto."
                file={vendor.akta}
                existingUrl={existingDocs.akta_url}
                accept="image/*,application/pdf"
                onChange={(e) => handleVendorFile(e, 'akta')}
              />

              <FilePicker
                id="npwp_doc"
                label="NPWP Badan Usaha"
                hint="Kartu NPWP atas nama badan usaha, bukan NPWP pribadi PIC."
                file={vendor.npwp_doc}
                existingUrl={existingDocs.npwp_doc_url}
                accept="image/*,application/pdf"
                onChange={(e) => handleVendorFile(e, 'npwp_doc')}
              />

              <FilePicker
                id="nib_doc"
                label="NIB / Izin Usaha"
                hint="Dokumen NIB dari sistem OSS."
                file={vendor.nib_doc}
                existingUrl={existingDocs.nib_doc_url}
                accept="image/*,application/pdf"
                onChange={(e) => handleVendorFile(e, 'nib_doc')}
              />

              <Button className="w-full mt-4" onClick={nextStep} disabled={!businessDocsValid}>
                Selanjutnya
              </Button>
            </div>
          )}

          {currentStep === 'identity' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-brand-gray-800">
                {isVendor ? 'Identitas Penanggung Jawab' : 'Identitas Dasar'}
              </h2>
              {isVendor && (
                <p className="text-sm text-brand-gray-450">
                  KTP <strong>penanggung jawab</strong>, bukan dokumen perusahaan. Yang memegang akun,
                  menerima OTP, dan bertanggung jawab atas pekerjaan tetaplah orang.
                </p>
              )}
              <div>
                <label htmlFor="ktp_number" className={LABEL_CLASS}>
                  Nomor KTP (NIK)
                </label>
                <input
                  id="ktp_number"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  className={INPUT_CLASS}
                  placeholder="16 Digit NIK"
                  value={formData.ktp_number}
                  onChange={(e) => setFormData({ ...formData, ktp_number: e.target.value.replace(/\D/g, '') })}
                />
                {isReverify && maskedHints.ktp && (
                  <p className="text-xs text-brand-gray-450 mt-1">
                    NIK tercatat: {maskedHints.ktp} — ketik ulang lengkap untuk memastikan identitas.
                  </p>
                )}
              </div>
              <Button className="w-full mt-4" onClick={nextStep} disabled={formData.ktp_number.length < 16}>
                Selanjutnya
              </Button>
            </div>
          )}

          {currentStep === 'personal_docs' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-brand-gray-800">
                {isVendor ? 'Dokumen Penanggung Jawab' : 'Dokumen Pribadi'}
              </h2>
              <FilePicker
                id="ktp_photo"
                label="Foto KTP"
                file={formData.ktp_photo}
                existingUrl={isReverify ? existingPhotos.ktp_photo_url : ''}
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'ktp_photo')}
              />
              <FilePicker
                id="selfie_ktp"
                label="Selfie dengan KTP"
                file={formData.selfie_ktp}
                existingUrl={isReverify ? existingPhotos.selfie_ktp_url : ''}
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'selfie_ktp')}
              />
              <Button
                className="w-full mt-4"
                onClick={nextStep}
                disabled={
                  (!formData.ktp_photo && !(isReverify && existingPhotos.ktp_photo_url)) ||
                  (!formData.selfie_ktp && !(isReverify && existingPhotos.selfie_ktp_url))
                }
              >
                Selanjutnya
              </Button>
            </div>
          )}

          {currentStep === 'profile' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-brand-gray-800">Profil Profesional</h2>
              <div>
                <label htmlFor="bio" className={LABEL_CLASS}>
                  Deskripsi / Pengalaman
                </label>
                <textarea
                  id="bio"
                  className={`${INPUT_CLASS} h-24 resize-none`}
                  placeholder={
                    isVendor
                      ? 'Ceritakan bidang usaha, pengalaman, dan kapasitas tim Anda...'
                      : 'Ceritakan pengalaman dan keahlian Anda...'
                  }
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>
              <Button className="w-full mt-4" onClick={nextStep} disabled={!formData.bio}>
                Selanjutnya
              </Button>
            </div>
          )}

          {currentStep === 'location' && (
            <div className="space-y-4 animate-in fade-in flex flex-col">
              <h2 className="text-xl font-bold text-brand-gray-800">
                {isVendor ? 'Lokasi Kantor / Basecamp' : 'Lokasi Basecamp'}
              </h2>
              <p className="text-sm text-brand-gray-400">
                Tentukan lokasi tempat Anda bekerja (basecamp) di peta. Jarak pesanan dihitung dari lokasi ini.
              </p>

              <div className="min-h-[240px] border border-brand-gray-200 rounded-md overflow-hidden relative">
                <MapPicker
                  lat={formData.basecamp_lat}
                  lng={formData.basecamp_lon}
                  onChange={(lat, lng) => setFormData({ ...formData, basecamp_lat: lat, basecamp_lon: lng })}
                />
              </div>

              <RegionSelect
                value={{ province: formData.province, city: formData.city, district: formData.district }}
                onChange={(v) => setFormData({ ...formData, ...v })}
                selectClassName={INPUT_CLASS}
                labelClassName={LABEL_CLASS}
              />
              <div>
                <label htmlFor="address_detail" className={LABEL_CLASS}>
                  Detail Alamat (opsional)
                </label>
                <input
                  id="address_detail"
                  className={INPUT_CLASS}
                  placeholder="Nama jalan, patokan, dsb."
                  value={formData.address_detail}
                  onChange={(e) => setFormData({ ...formData, address_detail: e.target.value })}
                />
              </div>

              <Button
                className="w-full"
                onClick={nextStep}
                disabled={!formData.province || !formData.city || !formData.district}
              >
                Selanjutnya
              </Button>
            </div>
          )}

          {currentStep === 'bank' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-brand-gray-800">Rekening Pencairan</h2>
              {isVendor && (
                <div className="rounded-md border border-brand-warning-border bg-brand-warning-soft p-3">
                  <p className="text-xs leading-relaxed text-brand-gray-700">
                    Rekening wajib <strong>atas nama badan usaha</strong>, bukan rekening pribadi PIC atau
                    pihak ketiga. Rekening yang namanya tidak cocok akan ditolak saat verifikasi.
                  </p>
                </div>
              )}
              <div>
                <label htmlFor="bank_code" className={LABEL_CLASS}>
                  Kode Bank
                </label>
                <select
                  id="bank_code"
                  className={INPUT_CLASS}
                  value={formData.bank_code}
                  onChange={(e) => setFormData({ ...formData, bank_code: e.target.value })}
                >
                  <option value="">Pilih Bank</option>
                  <option value="BCA">BCA</option>
                  <option value="MANDIRI">Bank Mandiri</option>
                  <option value="BNI">BNI</option>
                  <option value="BRI">BRI</option>
                  <option value="BSI">BSI</option>
                </select>
              </div>
              <div>
                <label htmlFor="bank_account_number" className={LABEL_CLASS}>
                  Nomor Rekening
                </label>
                <input
                  id="bank_account_number"
                  type="text"
                  inputMode="numeric"
                  className={INPUT_CLASS}
                  placeholder="Contoh: 1234567890"
                  value={formData.bank_account_number}
                  onChange={(e) =>
                    setFormData({ ...formData, bank_account_number: e.target.value.replace(/\D/g, '') })
                  }
                />
                {isReverify && maskedHints.bank && (
                  <p className="text-xs text-brand-gray-450 mt-1">
                    Rekening tercatat: {maskedHints.bank} — ketik ulang lengkap untuk memastikan tujuan pencairan.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="bank_account_name" className={LABEL_CLASS}>
                  Nama Pemilik Rekening
                </label>
                <input
                  id="bank_account_name"
                  type="text"
                  className={`${INPUT_CLASS} uppercase`}
                  placeholder={isVendor ? 'SESUAI NAMA BADAN USAHA' : 'SESUAI BUKU TABUNGAN'}
                  value={formData.bank_account_name}
                  onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value.toUpperCase() })}
                />
              </div>
              {/* Komisi & batas tarik ditampilkan DI SINI, di titik mitra
                  menyetujui — angkanya dari platform_settings, bukan diketik.
                  Persetujuan atas skema komisi tak ada artinya kalau angkanya
                  bisa basi. */}
              <LegalConsentCheckbox checked={agreed} onChange={setAgreed} id="mitra-consent">
                <div className="mb-3 space-y-1.5">
                  <p className="text-xs font-semibold text-brand-gray-900">Ketentuan kemitraan yang berlaku</p>
                  <div className="flex justify-between text-xs text-brand-gray-700">
                    <span>Komisi platform per transaksi selesai</span>
                    <span className="font-semibold text-brand-gray-900">
                      {formatFeeRate(platformConfig.platform_fee_rate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-brand-gray-700">
                    <span>Penarikan saldo</span>
                    <span className="font-semibold text-brand-gray-900">
                      min {formatPrice(platformConfig.min_transaction)} · biaya{' '}
                      {formatPrice(platformConfig.withdrawal_fee)}
                    </span>
                  </div>
                  {isVendor && (
                    <p className="text-[11px] leading-relaxed text-brand-gray-700 pt-1">
                      Sebagai Mitra Badan Usaha, kamu bertanggung jawab penuh atas personel yang kamu
                      tugaskan ke lokasi pelanggan.
                    </p>
                  )}
                  <p className="text-[11px] leading-relaxed text-brand-gray-450 pt-1">
                    Tarif dapat berubah sewaktu-waktu; perubahan diumumkan di platform. Pembayaran di luar
                    platform dilarang.
                  </p>
                </div>
              </LegalConsentCheckbox>

              <Button
                className="w-full mt-4"
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !agreed ||
                  !formData.bank_code ||
                  !formData.bank_account_number ||
                  !formData.bank_account_name.trim()
                }
              >
                {loading ? 'Mengirim Data...' : isReverify ? 'Perbaiki & Kirim Ulang' : 'Kirim Pendaftaran'}
              </Button>
            </div>
          )}
        </div>

        {!isLastStep && <div className="h-4" />}
      </div>
    </div>
  );
}

// useSearchParams wajib dibungkus Suspense agar tidak gagal saat prerender (Next.js App Router).
export default function MitraRegisterPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MitraRegisterForm />
    </Suspense>
  );
}
