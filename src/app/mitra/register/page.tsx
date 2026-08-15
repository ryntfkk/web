"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Building2, Camera, CheckCircle2, FileText, MapPin, Upload, User, ShieldAlert, AlertCircle, MailWarning } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { PageSkeleton } from '@/components/ui/skeleton';
import RegionSelect from '@/components/ui/RegionSelect';
import PhoneVerificationModal from '@/components/ui/PhoneVerificationModal';
import EmailVerificationModal from '@/components/ui/EmailVerificationModal';
import { Stepper } from '@/components/ui/stepper';
import { StickyActionBar } from '@/components/ui/sticky-action-bar';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import MitraModal from '@/components/mitra/MitraModal';
import PhotoPickerBox from '@/components/mitra/PhotoPickerBox';
import { useAuthStore } from '@/lib/store/authStore';
import { useUpload } from '@/hooks/useUpload';
import LegalConsentCheckbox from '@/components/auth/LegalConsentCheckbox';
import { useActiveLegalDocuments } from '@/hooks/useLegalConsent';
import { usePlatformConfig, formatFeeRate } from '@/hooks/usePlatformConfig';
import { useCategories } from '@/hooks/useCategories';
import { usePartnerCategories } from '@/hooks/usePartnerCategories';
import {
  categoryQuotaFor,
  expertiseStepValid,
  stepsForPartner,
  type ExpertiseRow,
  type StepKeyName,
} from '@/lib/category-slots';
import { formatPrice } from '@/lib/format';
import dynamic from 'next/dynamic';
import Image from 'next/image';
// Leaflet CSS kini di-import global di app/globals.css (lihat catatan di sana).

type PartnerType = 'individual' | 'vendor';

/**
 * Bentuk badan usaha . cerminan enum `business_entity_form` (migrasi 000063)
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
const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  // Tanpa fallback, area peta collapse jadi nol tinggi selama chunk Leaflet
  // dimuat dan seluruh form melompat saat peta akhirnya muncul.
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-lg bg-brand-gray-60 animate-pulse">
      <MapPin className="h-8 w-8 text-brand-gray-300" />
    </div>
  ),
});

// Gaya field mengikuti ServiceForm (`components/mitra/ServiceForm.tsx`) dan
// DESIGN_GUIDELINES §4.4: padding 12px, teks 14px. Padding vertikal & ukuran
// font pada input di bawah 768px tetap ditimpa globals.css (10px / 16px demi
// mencegah auto-zoom iOS) . itu disengaja, jangan dilawan dari sini.
const INPUT_CLASS =
  'w-full rounded-md border border-brand-gray-100 bg-white p-3 text-sm text-brand-gray-900 placeholder:text-brand-gray-450 focus:outline-none focus:border-brand-red';
const LABEL_CLASS = 'mb-2 block text-sm font-semibold text-brand-gray-900';
const HINT_CLASS = 'mb-2 text-xs text-brand-gray-450';
/** Judul langkah: 16px di ponsel, baru membesar di desktop (guideline §7.3). */
const STEP_TITLE_CLASS = 'text-base font-bold text-brand-gray-900 lg:text-lg';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Batas foto bukti per kategori . sama dengan yang ditegakkan backend (000080). */
const MAX_EVIDENCE_PHOTOS = 5;

/**
 * Draf TEKS wizard di sessionStorage . satu kunci JSON. Berkas (KTP, selfie,
 * dokumen, bukti kategori) sengaja TIDAK ikut: File tidak bisa diserialisasi,
 * dan sessionStorage hilang saat tab ditutup sehingga drafnya tidak menetap.
 * Dibersihkan saat submit sukses dan saat keluar lewat konfirmasi.
 */
const DRAFT_KEY = 'mitra-register-draft-v1';

/** Kunci tiap langkah. Urutannya ditentukan `stepsFor()`, bukan angka mentah. */
type StepKey = StepKeyName;

/** Label pendek untuk indikator progres . panjang akan memaksa scroll di 360px. */
const STEP_LABELS: Record<StepKey, string> = {
  type: 'Tipe',
  business: 'Usaha',
  identity: 'Identitas',
  profile: 'Profil',
  expertise: 'Keahlian',
  location: 'Lokasi',
  bank: 'Rekening',
};

/**
 * Urutan langkah bergantung tipe mitra (V3).
 *
 * `type` hanya ada saat PENDAFTARAN BARU. Pada verifikasi ulang tipe mitra tidak
 * boleh berubah . mengubahnya berarti mengganti subjek hukum kontrak, dan
 * backend memang tidak menerima `partner_type` di endpoint resubmission.
 *
 * Data badan usaha datang LEBIH DULU daripada identitas PIC supaya jelas bahwa
 * KTP yang diminta berikutnya adalah KTP penanggung jawab, bukan "KTP
 * perusahaan" yang tidak pernah ada.
 *
 * Dokumen TIDAK lagi berdiri sebagai langkah sendiri. Satu layar penuh yang
 * hanya berisi satu field (dulu: NIK saja, lalu bio saja) membuat pendaftaran
 * terasa panjang tanpa menambah informasi apa pun . dokumen kini menempel pada
 * langkah data yang bersangkutan.
 *
 * `expertise` (kategori jasa + foto alat & bahan) TETAP berdiri sendiri, dan itu
 * tidak bertentangan dengan aturan di atas: isinya bukan satu field melainkan
 * pilihan kategori beserta sampai 5 foto per kategori (vendor: sampai 3
 * kategori). Menempelkannya ke langkah Profil akan membuat satu layar berisi
 * foto profil, nama, bio, kategori, dan 15 unggahan sekaligus.
 */
const stepsFor = stepsForPartner;

const isImageUrl = (url: string) => /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url);

/**
 * Kotak unggah berkas . dipakai KTP maupun dokumen badan usaha.
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
  error,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  file: File | null;
  existingUrl?: string;
  accept: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  // Pratinjau dibangun saat render, bukan lewat setState di dalam efek: efek
  // yang menulis state memicu render kedua dan sudah dilarang lint di repo ini.
  const previewUrl = useMemo(
    () => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const shownPreview = previewUrl || (existingUrl && isImageUrl(existingUrl) ? existingUrl : null);
  const hasFile = !!file || !!existingUrl;

  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      {hint && <p className={HINT_CLASS}>{hint}</p>}
      <label
        htmlFor={id}
        className={`block cursor-pointer overflow-hidden rounded-md border-2 border-dashed transition-colors ${error
            ? 'border-brand-error-border bg-brand-error-soft'
            : hasFile
              ? 'border-brand-red/40 bg-white'
              : 'border-brand-gray-200 bg-white hover:bg-brand-gray-60'
          }`}
      >
        {shownPreview ? (
          // Pratinjau wajib: tanpa ini mitra baru tahu ia salah unggah setelah
          // admin menolak berkasnya berhari-hari kemudian.
          //
          // Tetap `<img>`, BUKAN next/image: `shownPreview` bisa berupa URL objek
          // (`URL.createObjectURL`) dari berkas yang baru dipilih, dan optimizer
          // Next tidak bisa memproses skema `blob:`.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownPreview} alt={`Pratinjau ${label}`} className="h-36 w-full object-contain bg-brand-gray-60" />
        ) : hasFile ? (
          <div className="flex h-36 flex-col items-center justify-center gap-2 bg-brand-gray-60">
            <FileText className="h-7 w-7 text-brand-gray-400" aria-hidden />
            <span className="px-3 text-center text-xs text-brand-gray-700">Berkas PDF terpilih</span>
          </div>
        ) : (
          <div className="flex h-28 flex-col items-center justify-center gap-2">
            <Upload className="h-6 w-6 text-brand-gray-400" aria-hidden />
            <span className="px-3 text-center text-xs text-brand-gray-450">Ketuk untuk memilih {label}</span>
          </div>
        )}
        <span className="flex items-center justify-between gap-2 border-t border-brand-gray-100 px-3 py-2 text-xs">
          <span className="min-w-0 truncate text-brand-gray-700">
            {file ? file.name : existingUrl ? 'Berkas lama dipakai' : 'Belum ada berkas'}
          </span>
          <span className="shrink-0 font-semibold text-brand-red">{hasFile ? 'Ganti' : 'Pilih'}</span>
        </span>
      </label>
      <input id={id} type="file" className="hidden" accept={accept} onChange={onChange} />
      {error && <p className="mt-1 text-xs text-brand-error">{error}</p>}
    </div>
  );
}

/**
 * Adaptor `PhotoPickerBox` untuk berkas yang BELUM diunggah.
 *
 * Pendaftaran menahan `File[]` dan baru mengunggahnya saat submit (sama seperti
 * KTP) . mengunggah tiap kali pemohon mundur-maju antar langkah membakar kuota
 * untuk pengajuan yang mungkin tak pernah dikirim. Karena itu pratinjaunya
 * lahir dari `URL.createObjectURL`, dan siklus hidup URL objek itulah satu-
 * satunya alasan pembungkus ini ada.
 *
 * Di lingkup MODUL, bukan di dalam form . alasannya sama dengan `FilePicker`:
 * komponen yang dibuat ulang tiap render mengosongkan berkas yang sudah dipilih.
 */
function PhotoPicker({
  id,
  files,
  max,
  error,
  onPick,
  onRemove,
}: {
  id: string;
  files: File[];
  max: number;
  error?: string;
  onPick: (picked: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  // Dibangun saat render, bukan lewat setState di dalam efek (lint repo).
  const items = useMemo(
    () => files.map((f) => { const src = URL.createObjectURL(f); return { key: src, src }; }),
    [files],
  );
  useEffect(
    () => () => {
      items.forEach((it) => URL.revokeObjectURL(it.src));
    },
    [items],
  );

  return (
    <PhotoPickerBox id={id} items={items} max={max} error={error} onPick={onPick} onRemove={onRemove} />
  );
}

function MitraRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isReverify = searchParams?.get('mode') === 'reverify';

  // Model mitra instan (keputusan Q5a PLAN-MITRA-INSTAN): wizard ini
  // DIPENSIUNKAN untuk pendaftaran BARU . jalurnya /jadi-mitra/daftar (instan,
  // tanpa KYC). Wizard tetap hidup untuk (a) ?mode=reverify . pengajuan ulang
  // setelah KYC ditolak butuh form lengkap (PUT /partners/me/resubmission),
  // dan (b) saat sakelar instan OFF di backend (jendela pra-flip / flip-back):
  // di keadaan itu backend MENUNTUT KYC penuh, dan wizard inilah satu-satunya
  // form yang memilikinya . redirect justru mematikan pendaftaran total.
  const instantOff = usePlatformConfig().instant_partner_activation === false;
  useEffect(() => {
    if (!isReverify && !instantOff) router.replace('/jadi-mitra/daftar');
  }, [isReverify, instantOff, router]);

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showEmailVerify, setShowEmailVerify] = useState(false);
  // Modal email bisa dibuka dari DUA tempat: banner di atas form, dan gerbang di
  // handleSubmit. Hanya yang kedua boleh melanjutkan pengiriman setelah sukses .
  // kalau tidak, menekan "Verifikasi Sekarang" di banner akan mengirim form yang
  // baru terisi separuh.
  const [submitAfterEmailVerify, setSubmitAfterEmailVerify] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { data: legalDocs } = useActiveLegalDocuments();
  const platformConfig = usePlatformConfig();
  const user = useAuthStore((s) => s.user);
  const { uploadFile: uploadAvatar, isUploading: avatarUploading } = useUpload('avatar');
  // Bukti alat & bahan (000080). Tipe berkasnya menentukan prefix object key,
  // dan backend MENCOCOKKAN prefix itu saat memvalidasi . bukti yang diunggah
  // lewat jalur lain (mis. /partners/upload/presigned-url, yang tidak memakai
  // prefix sama sekali) akan ditolak INVALID_EVIDENCE.
  const { uploadFile: uploadEvidence } = useUpload('category-evidence');
  // Hanya kategori UTAMA yang ditawarkan: slot bermakna di level itu, dan
  // /categories memang hanya membalas kategori utama yang aktif.
  const { data: mainCategories } = useCategories();
  // Pengajuan ulang: mitra mungkin SUDAH punya kategori dari pengajuan
  // sebelumnya. Backend memperlakukan daftar kosong sebagai "pertahankan yang
  // lama", jadi jangan paksa ia memilih & mengunggah ulang hanya karena alamat
  // basecamp-nya ditolak. Hanya diminta bila ia memang belum punya.
  const { data: existingCategories } = usePartnerCategories(!!isReverify);
  // Server menolak onboarding tanpa nomor terverifikasi. Tampilkan syaratnya di
  // depan, bukan sebagai error setelah lima langkah form dan dua unggahan KTP.
  const needsPhone = !!user && !user.profile_complete;
  // Sejak WhatsApp dipakai khusus OTP, email adalah satu-satunya kanal untuk
  // mengabari mitra soal hasil verifikasi & pencairan dana . jadi server
  // mewajibkannya (EMAIL_NOT_VERIFIED). Ditampilkan di depan, sama seperti
  // syarat nomor HP, bukan sebagai kejutan di akhir form.
  const needsEmail = !!user && !user.email_verified;
  // Shell mitra hanya memasang sidebar untuk akun bermode mitra (pengajuan
  // ulang); pendaftar baru membuka halaman ini sebagai pelanggan.
  const isPartnerMode = user?.active_role === 'partner';

  const [partnerType, setPartnerType] = useState<PartnerType>('individual');

  /**
   * Kategori jasa yang diklaim + bukti alatnya (000080).
   *
   * Bukti melekat PER KATEGORI, bukan satu set untuk seluruh pengajuan: foto
   * kompresor AC tidak membuktikan apa pun tentang klaim "Wedding Organizer".
   * Berkasnya disimpan sebagai File dan baru diunggah saat submit, sama seperti
   * KTP . mengunggah tiap kali pengguna mundur-maju antar langkah membakar
   * kuota untuk pengajuan yang mungkin tak pernah dikirim.
   */
  const [expertise, setExpertise] = useState<ExpertiseRow[]>([]);
  /**
   * Alasan penolakan berkas per baris kategori. Berkas yang kebesaran atau
   * melebihi kuota dulu dibuang DIAM-DIAM . pemohon memilih 8 foto, melihat 5,
   * dan mengira aplikasinya rusak.
   */
  const [evidenceErrors, setEvidenceErrors] = useState<Record<number, string>>({});

  /**
   * Menambahkan foto bukti ke satu baris kategori, sambil menjelaskan apa saja
   * yang ditolak. Penyaringan ukuran tetap ada karena backend menolak >5MB.
   */
  const handleEvidencePick = (idx: number, list: FileList | null) => {
    const all = Array.from(list ?? []);
    if (all.length === 0) return;

    const oversized = all.filter((f) => f.size > MAX_UPLOAD_BYTES);
    const fitting = all.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    const room = Math.max(0, MAX_EVIDENCE_PHOTOS - (expertise[idx]?.files.length ?? 0));
    const accepted = fitting.slice(0, room);
    const overflow = fitting.length - accepted.length;

    if (accepted.length > 0) {
      setExpertise((prev) =>
        prev.map((r, i) => (i === idx ? { ...r, files: [...r.files, ...accepted] } : r)),
      );
    }

    const reasons: string[] = [];
    if (oversized.length > 0) reasons.push(`${oversized.length} foto melebihi 5MB`);
    if (overflow > 0) reasons.push(`${overflow} foto tidak muat (maksimal ${MAX_EVIDENCE_PHOTOS})`);
    setEvidenceErrors((prev) => ({
      ...prev,
      [idx]: reasons.length > 0 ? `${reasons.join(' dan ')} . tidak ditambahkan.` : '',
    }));
  };

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

  // Profil publik . bagian akun, BUKAN bagian baris partner. Foto dan nama
  // inilah yang dilihat pelanggan di hasil pencarian, jadi keduanya dikumpulkan
  // saat pendaftaran, bukan ditagih belakangan lewat ProfileCompleteness ketika
  // mitra sudah terlanjur tayang tanpa wajah.
  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});

  // Data badan usaha . dipisah dari formData supaya mudah dipastikan TIDAK
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

  // Verifikasi ulang: URL berkas yang SUDAH ada. Mitra boleh mempertahankannya .
  // memaksa unggah ulang KTP hanya karena alamat basecamp ditolak itu menyiksa.
  const [existingPhotos, setExistingPhotos] = useState({ ktp_photo_url: '', selfie_ktp_url: '' });
  const [existingDocs, setExistingDocs] = useState({ akta_url: '', npwp_doc_url: '', nib_doc_url: '' });
  const [rejectionReason, setRejectionReason] = useState('');
  const [maskedHints, setMaskedHints] = useState({ ktp: '', bank: '', npwp: '' });

  // Gerbang draf: efek penyimpan menunggu draf lama dipulihkan dulu, supaya
  // state awal yang masih kosong tidak menimpa draf sebelum sempat terbaca.
  const draftReady = useRef(false);

  const steps = stepsFor(partnerType, !!isReverify);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex >= steps.length - 1;
  const isVendor = partnerType === 'vendor';

  const nextStep = () => setStepIndex((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStepIndex((s) => Math.max(s - 1, 0));

  // Prefill profil dari akun yang sedang login. Nama tampil mitra perorangan
  // memang nama akunnya . mitra boleh memperbaikinya di sini, dan perbaikan itu
  // disimpan ke /users/me.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) return;
    setAvatarUrl((prev) => prev || user.avatar_url || '');
    setDisplayName((prev) => prev || user.name || '');
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Prefill dari endpoint draft khusus (P0-05). Dulu membaca /partners/me dan
  // mengharapkan `ktp_number` + data rekening ada di sana . dua-duanya tidak
  // pernah ada di DTO itu, jadi form selalu kosong tanpa penjelasan.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Pemulihan draf teks dari sessionStorage. Pada mode reverify dijalankan
    // SETELAH prefill server: draf memuat suntingan terakhir pengguna, jadi ia
    // menang atas nilai yang tersimpan di server.
    const applyDraft = () => {
      try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw) as {
            mode?: string;
            partnerType?: PartnerType;
            displayName?: string;
            formData?: Record<string, unknown>;
            vendor?: Record<string, unknown>;
          };
          // Draf mode lain dibiarkan . pendaftaran baru dan verifikasi ulang
          // mengisi field yang berbeda maknanya.
          if (draft.mode === (isReverify ? 'reverify' : 'new')) {
            if (!isReverify && (draft.partnerType === 'individual' || draft.partnerType === 'vendor')) {
              setPartnerType(draft.partnerType);
            }
            if (typeof draft.displayName === 'string' && draft.displayName) {
              setDisplayName(draft.displayName);
            }
            if (draft.formData) {
              setFormData((prev) => ({
                ...prev,
                ...(draft.formData as Partial<typeof prev>),
                // Berkas tidak pernah ikut draf . pertahankan yang di memori.
                ktp_photo: prev.ktp_photo,
                selfie_ktp: prev.selfie_ktp,
              }));
            }
            if (draft.vendor) {
              setVendor((prev) => ({
                ...prev,
                ...(draft.vendor as Partial<typeof prev>),
                akta: prev.akta,
                npwp_doc: prev.npwp_doc,
                nib_doc: prev.nib_doc,
              }));
            }
          }
        }
      } catch {
        // Draf korup dibuang diam-diam . ini kenyamanan, bukan data utama.
      }
      draftReady.current = true;
    };

    if (!isReverify) {
      applyDraft();
      return;
    }
    fetchAPI<ResubmissionDraft>('/partners/me/resubmission').then((res) => {
      if (!res.success || !res.data) {
        applyDraft();
        return;
      }
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
      // seperti foto KTP . kecuali yang memang ditolak admin.
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
      applyDraft();
    });
  }, [isReverify]);

  // Simpan draf TEKS tiap perubahan (debounce 500ms). Menunggu draftReady:
  // sebelum draf lama terbaca, state awal yang kosong tidak boleh menimpanya.
  useEffect(() => {
    if (!draftReady.current) return;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            mode: isReverify ? 'reverify' : 'new',
            partnerType,
            displayName,
            formData: {
              ktp_number: formData.ktp_number,
              bio: formData.bio,
              province: formData.province,
              city: formData.city,
              district: formData.district,
              address_detail: formData.address_detail,
              basecamp_lat: formData.basecamp_lat,
              basecamp_lon: formData.basecamp_lon,
              bank_code: formData.bank_code,
              bank_account_number: formData.bank_account_number,
              bank_account_name: formData.bank_account_name,
            },
            vendor: {
              display_name: vendor.display_name,
              legal_entity_name: vendor.legal_entity_name,
              entity_form: vendor.entity_form,
              npwp: vendor.npwp,
              nib: vendor.nib,
              pic_name: vendor.pic_name,
              pic_position: vendor.pic_position,
              business_phone: vendor.business_phone,
              business_email: vendor.business_email,
            },
          }),
        );
      } catch {
        // Storage penuh / dimatikan . drafnya saja yang hilang, bukan form.
      }
    }, 500);
    return () => clearTimeout(t);
  }, [isReverify, partnerType, displayName, formData, vendor]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * Penjaga ukuran & jenis berkas di sisi klien.
   *
   * Bukan pengganti validasi server, tapi mencegah mitra menunggu unggahan 20MB
   * selesai hanya untuk ditolak . di koneksi seluler itu menit-menit yang hilang.
   */
  const rejectFile = (file: File, id: string): boolean => {
    if (file.size > MAX_UPLOAD_BYTES) {
      setFileErrors((prev) => ({ ...prev, [id]: 'Ukuran berkas maksimal 5MB' }));
      return true;
    }
    setFileErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    return false;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'ktp_photo' | 'selfie_ktp') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (rejectFile(file, field)) return;
    setFormData((prev) => ({ ...prev, [field]: file }));
  };

  const handleVendorFile = (e: React.ChangeEvent<HTMLInputElement>, field: 'akta' | 'npwp_doc' | 'nib_doc') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (rejectFile(file, field)) return;
    setVendor((prev) => ({ ...prev, [field]: file }));
  };

  /**
   * Avatar diunggah SEGERA saat dipilih, lewat `useUpload('avatar')` . jalur
   * yang sama dengan /mitra/profile dan /profile/account. Sengaja tidak memakai
   * `/partners/upload/presigned-url` seperti dokumen KYC: avatar milik akun dan
   * disimpan lewat PATCH /users/me, sedangkan berkas KYC milik baris partner.
   */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setAvatarError('Ukuran foto maksimal 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setAvatarError('Foto profil harus berupa gambar (JPG atau PNG)');
      return;
    }
    const url = await uploadAvatar(file);
    if (!url) {
      setAvatarError('Gagal mengunggah foto. Coba lagi.');
      return;
    }
    setAvatarUrl(url);
  };

  /**
   * `purpose` menentukan PREFIKS penyimpanan di server, bukan sekadar label.
   *
   * Endpoint ini melayani berkas publik (portofolio, foto layanan) DAN berkas
   * identitas (KTP, swafoto, akta/NPWP/NIB). Tanpa penanda, semuanya jatuh ke
   * prefiks `uploads/` yang dapat dibaca siapa pun . itulah temuan A11-T2,
   * dan berkas lama yang sudah terlanjur di sana sudah dipindahkan.
   *
   * Nilai KYC yang dikenal server: 'ktp', 'selfie', 'documents'.
   * Mengirim nilai lain (atau tidak mengirim sama sekali) = berkas PUBLIK.
   */
  const uploadFileToS3 = async (file: File, purpose: 'ktp' | 'selfie' | 'documents') => {
    // 1. Get presigned URL
    const { success, data } = await fetchAPI<{ upload_url: string; file_url: string }>(
      '/partners/upload/presigned-url',
      {
        method: 'POST',
        // file_size WAJIB: ikut ditandatangani ke presigned URL, ditolak bila 0.
        body: JSON.stringify({ purpose, filename: file.name, content_type: file.type, file_size: file.size }),
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

  // Syarat lolos tiap langkah . dicerminkan dari validasi backend
  // (`validatePartnerTypeFields`) supaya pemohon tidak menyelesaikan enam
  // langkah lalu ditolak karena NIB kurang satu digit.
  //
  // NPWP & NIB OPSIONAL. Keduanya terbit lewat DJP dan OSS, sering belum di
  // tangan pemohon pada hari ia mendaftar. Yang tetap wajib adalah DOKUMEN-nya,
  // yang ditinjau admin . jadi tidak ada verifikasi yang dilonggarkan.
  const npwpValid = vendor.npwp.length === 0 || (vendor.npwp.length >= 15 && vendor.npwp.length <= 16);
  const nibValid = vendor.nib.length === 0 || vendor.nib.length === 13;

  const businessValid =
    vendor.display_name.trim().length >= 3 &&
    vendor.legal_entity_name.trim() !== '' &&
    vendor.entity_form !== '' &&
    vendor.pic_name.trim() !== '' &&
    npwpValid &&
    nibValid;

  const businessDocsValid =
    (!!vendor.akta || !!existingDocs.akta_url) &&
    (!!vendor.npwp_doc || !!existingDocs.npwp_doc_url) &&
    (!!vendor.nib_doc || !!existingDocs.nib_doc_url);

  const identityValid =
    formData.ktp_number.length === 16 &&
    (!!formData.ktp_photo || (isReverify && !!existingPhotos.ktp_photo_url)) &&
    (!!formData.selfie_ktp || (isReverify && !!existingPhotos.selfie_ktp_url));

  // Nama tampil vendor sudah dikumpulkan di langkah `business`; yang tersisa di
  // langkah Profil untuk vendor hanyalah foto.
  const profileValid = !!avatarUrl && (isVendor || displayName.trim().length >= 3);

  // Kuota slot kategori mengikuti TIPE mitra (setelan platform: 1 perorangan,
  // 3 vendor). Batasnya ditegakkan server juga . ini hanya supaya pemohon tidak
  // memilih lima kategori lalu ditolak setelah mengunggah 25 foto.
  // Aturan slot tinggal di `lib/category-slots` . satu tempat, dan bisa diuji
  // tanpa merender wizard enam langkah.
  const categoryQuota = categoryQuotaFor(partnerType);
  const keptCategories = isReverify ? (existingCategories?.categories ?? []) : [];
  const expertiseValid = expertiseStepValid({
    picked: expertise,
    quota: categoryQuota,
    keptCount: keptCategories.length,
  });

  const canProceed = (() => {
    switch (currentStep) {
      case 'type':
        return true;
      case 'business':
        return businessValid && businessDocsValid;
      case 'identity':
        return identityValid;
      case 'profile':
        return profileValid && !avatarUploading;
      case 'expertise':
        return expertiseValid;
      case 'location':
        return !!formData.province && !!formData.city && !!formData.district;
      case 'bank':
        return (
          !loading &&
          agreed &&
          !!formData.bank_code &&
          !!formData.bank_account_number &&
          !!formData.bank_account_name.trim()
        );
      default:
        return false;
    }
  })();

  const handleBack = () => {
    if (stepIndex > 0) {
      prevStep();
      return;
    }
    // Verifikasi ulang dimulai dari halaman status; keluar dari sana tidak
    // membuang isian apa pun karena datanya sudah tersimpan di server.
    if (isReverify) {
      router.back();
      return;
    }
    setShowExitConfirm(true);
  };

  const handleSubmit = async () => {
    // Email terverifikasi adalah syarat server (EMAIL_NOT_VERIFIED). Dicegat di
    // sini, SEBELUM unggahan ke S3, supaya pengguna tidak kehilangan isian dan
    // tidak membakar kuota unggah untuk permintaan yang pasti ditolak.
    //
    // Dibaca dari getState(), bukan variabel `user` hasil render: setelah modal
    // verifikasi sukses, handleSubmit dipanggil ulang dan closure lama masih
    // memegang nilai lama . itu akan memunculkan modal yang sama berulang.
    if (!useAuthStore.getState().user?.email_verified) {
      setSubmitAfterEmailVerify(true);
      setShowEmailVerify(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verifikasi ulang boleh mempertahankan foto lama; pendaftaran baru wajib
      // mengunggah keduanya.
      if (!isReverify && (!formData.ktp_photo || !formData.selfie_ktp)) {
        throw new Error('Mohon lengkapi foto KTP dan Selfie');
      }
      if (!avatarUrl) {
        throw new Error('Mohon unggah foto profil di langkah Profil');
      }

      // ── Profil akun disimpan LEBIH DULU ──
      // Urutannya penting. Kalau onboarding dijalankan duluan lalu PATCH gagal,
      // mitra sudah terlanjur ada tanpa foto/nama dan tidak bisa mengulang
      // pendaftaran karena barisnya sudah ada . buntu yang persis sama pernah
      // terjadi pada /legal/accept (lihat dto.go OnboardingRequest).
      const profilePatch: Record<string, string> = {};
      if (avatarUrl && avatarUrl !== user?.avatar_url) profilePatch.avatar_url = avatarUrl;
      if (!isVendor && displayName.trim() && displayName.trim() !== user?.name) {
        profilePatch.name = displayName.trim();
      }
      if (Object.keys(profilePatch).length > 0) {
        // /users/me, BUKAN /partners/me: `partner.UpdateProfileRequest` tidak
        // punya field avatar_url sama sekali dan membuangnya diam-diam (P0-03).
        const profileRes = await fetchAPI('/users/me', {
          method: 'PATCH',
          body: JSON.stringify(profilePatch),
          credentials: 'include',
        });
        if (!profileRes.success) {
          throw new Error(profileRes.message || 'Gagal menyimpan foto profil dan nama tampil');
        }
        useAuthStore.getState().updateUser(profilePatch);
      }

      const ktpUrl = formData.ktp_photo
        ? await uploadFileToS3(formData.ktp_photo, 'ktp')
        : existingPhotos.ktp_photo_url;
      const selfieUrl = formData.selfie_ktp
        ? await uploadFileToS3(formData.selfie_ktp, 'selfie')
        : existingPhotos.selfie_ktp_url;

      if (!ktpUrl || !selfieUrl) throw new Error('Mohon lengkapi foto KTP dan Selfie');

      let vendorFields = {};
      if (isVendor) {
        const aktaUrl = vendor.akta ? await uploadFileToS3(vendor.akta, 'documents') : existingDocs.akta_url;
        const npwpDocUrl = vendor.npwp_doc ? await uploadFileToS3(vendor.npwp_doc, 'documents') : existingDocs.npwp_doc_url;
        const nibDocUrl = vendor.nib_doc ? await uploadFileToS3(vendor.nib_doc, 'documents') : existingDocs.nib_doc_url;
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

      // Bukti alat & bahan diunggah SETELAH dokumen wajib. Kegagalannya tidak
      // dibuang diam-diam: kategori tanpa bukti akan ditolak server
      // (EVIDENCE_REQUIRED), dan pemohon berhak tahu foto mana yang gagal
      // sebelum seluruh pengajuannya ditolak.
      const mainCategoriesPayload: { category_id: string; evidence_urls: string[] }[] = [];
      for (const row of expertise) {
        const urls: string[] = [];
        for (const file of row.files) {
          const url = await uploadEvidence(file);
          if (!url) throw new Error('Gagal mengunggah foto alat & bahan. Coba lagi.');
          urls.push(url);
        }
        mainCategoriesPayload.push({ category_id: row.category_id, evidence_urls: urls });
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
        // Kategori jasa + buktinya (000080). Ditulis server dalam transaksi yang
        // SAMA dengan pembuatan mitra . mitra yang lahir tanpa kategorinya akan
        // tertahan di gerbang verifikasi tanpa cara memperbaikinya sendiri.
        //
        // Sengaja DIHILANGKAN saat kosong, bukan dikirim sebagai []. Pada
        // pengajuan ulang, "tidak dikirim" berarti pertahankan kategori lama .
        // mengirim array kosong menyampaikan maksud yang sama tapi mengandalkan
        // server menafsirkannya begitu.
        ...(mainCategoriesPayload.length > 0 ? { main_categories: mainCategoriesPayload } : {}),
        // `partner_type` HANYA di pendaftaran baru. Endpoint resubmission tidak
        // menerimanya: tipe mitra = subjek hukum kontrak, dan menggantinya
        // sendiri lewat verifikasi ulang berarti mengganti pihak yang terikat.
        ...(isReverify ? {} : { partner_type: partnerType }),
        // Field badan usaha hanya ikut untuk vendor. Mengirimnya sebagai string
        // kosong untuk perorangan pun DITOLAK server . dan memang seharusnya:
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
        // Jaring pengaman: kalau state klien basi (mis. email diubah di tab
        // lain), server tetap yang memutuskan. Buka modal alih-alih menampilkan
        // pesan buntu.
        const detail = typeof res.error === 'string' ? res.error : res.error?.details;
        if (typeof detail === 'string' && detail.includes('EMAIL_NOT_VERIFIED')) {
          setSubmitAfterEmailVerify(true);
          setShowEmailVerify(true);
          return;
        }
        throw new Error(res.message || (typeof res.error === 'string' ? res.error : 'Gagal mengirim form'));
      }

      // F-01: status pengajuan adalah kunci masuk shell mitra . tanpa
      // membuangnya dari cache, pelamar yang baru saja mengirim formulir masih
      // terbaca 'NONE' (hasil 404 sebelum ia punya baris partner) selama
      // staleTime 60 detik, dan halaman mana pun di /mitra/* akan melemparnya
      // pulang persis setelah pendaftaran berhasil.
      await queryClient.invalidateQueries({ queryKey: ['partner', 'me', 'verification-status'] });
      // Pengajuan terkirim . draf teksnya tidak dibutuhkan lagi.
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* abaikan */ }
      router.push('/mitra/verification-status');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim form');
    } finally {
      setLoading(false);
    }
  };

  const submitLabel = loading
    ? 'Mengirim Data...'
    : isReverify
      ? 'Perbaiki & Kirim Ulang'
      : 'Kirim Pendaftaran';

  // Pendaftaran baru sedang dialihkan ke /jadi-mitra/daftar (lihat useEffect di
  // atas) . jangan sempat merender wizard lamanya. Saat sakelar instan OFF,
  // wizard TETAP dirender: itu satu-satunya form ber-KYC yang backend tuntut.
  if (!isReverify && !instantOff) return null;

  return (
    <div>
      <MitraPageHeader
        title={isReverify ? 'Verifikasi Ulang' : 'Pendaftaran Mitra'}
        subtitle={`Langkah ${stepIndex + 1} dari ${steps.length} · ${STEP_LABELS[currentStep]}`}
        variant="form"
        onBack={handleBack}
      />

      {/* pb-32: bilah aksi melayang di atas konten, tanpa ini field terakhir
          tiap langkah tertutup permanen dan tidak bisa digulir keluar. */}
      <MitraPageContainer variant="form" className="pb-32">
        {needsPhone && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-brand-warning-border bg-brand-warning-soft p-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-brand-warning" />
              <div>
                <p className="text-[13px] font-bold text-brand-gray-900">Verifikasi nomor HP dulu</p>
                <p className="mt-0.5 text-[11px] leading-snug text-brand-gray-700">
                  Dibutuhkan agar pelanggan dan tim kami dapat menghubungi kamu.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPhoneModal(true)}
              className="shrink-0 rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-red-dark active:scale-95"
            >
              Verifikasi
            </button>
          </div>
        )}

        {isReverify && rejectionReason && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-brand-error-border bg-brand-error-soft p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
            <div>
              <p className="text-[13px] font-bold text-brand-gray-900">Alasan penolakan sebelumnya</p>
              <p className="mt-1 whitespace-pre-line text-[11px] leading-snug text-brand-gray-700">{rejectionReason}</p>
              <p className="mt-1 text-[11px] italic text-brand-gray-450">
                Silakan perbaiki bagian tersebut.
              </p>
            </div>
          </div>
        )}

        {needsEmail && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-brand-warning-border bg-brand-warning-soft p-3">
            <div className="flex items-start gap-3">
              <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-brand-warning" />
              <div>
                <p className="text-[13px] font-bold text-brand-gray-900">Verifikasi email dulu</p>
                <p className="mt-0.5 text-[11px] leading-snug text-brand-gray-700">
                  Untuk menerima status pencairan dana.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSubmitAfterEmailVerify(false);
                setShowEmailVerify(true);
              }}
              className="shrink-0 rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-red-dark active:scale-95"
            >
              Verifikasi
            </button>
          </div>
        )}

        <PhoneVerificationModal
          isOpen={showPhoneModal}
          onClose={() => setShowPhoneModal(false)}
          onSuccess={() => setShowPhoneModal(false)}
        />

        {/* Melanjutkan pengiriman HANYA bila modal dibuka oleh gerbang di
            handleSubmit . tanpa panggilan ulang itu, pengguna harus menekan
            Kirim dua kali tanpa alasan yang terlihat. Dibuka dari banner:
            berhenti setelah verifikasi, form belum tentu lengkap. */}
        <EmailVerificationModal
          isOpen={showEmailVerify}
          onClose={() => setShowEmailVerify(false)}
          onSuccess={() => {
            setShowEmailVerify(false);
            if (submitAfterEmailVerify) {
              setSubmitAfterEmailVerify(false);
              void handleSubmit();
            }
          }}
        />

        {/* Label langkah punya `whitespace-nowrap`; di 320px enam langkah tidak
            muat, jadi barisnya digulir sendiri alih-alih memaksa seluruh halaman
            ikut bergeser horizontal. */}
        <div className="-mx-4 mb-5 overflow-x-auto px-4 pb-1">
          <Stepper
            steps={steps.map((k) => STEP_LABELS[k])}
            current={stepIndex + 1}
            className="min-w-[300px]"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-brand-error-border bg-brand-error-soft p-3 text-sm text-brand-red">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-brand-gray-100 bg-white p-4 shadow-sm sm:p-6">
          {currentStep === 'type' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className={STEP_TITLE_CLASS}>Daftar sebagai</h2>
              <p className="text-sm text-brand-gray-700">
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
                    className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors ${selected
                        ? 'border-brand-red bg-brand-error-soft'
                        : 'border-brand-gray-100 bg-white hover:border-brand-gray-400'
                      }`}
                  >
                    <Icon
                      className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? 'text-brand-red' : 'text-brand-gray-450'}`}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-brand-gray-900">{opt.title}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-brand-gray-700">{opt.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {currentStep === 'business' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className={STEP_TITLE_CLASS}>Data Badan Usaha</h2>

              <div>
                <label htmlFor="display_name" className={LABEL_CLASS}>
                  Nama Tampil
                </label>
                <p className={HINT_CLASS}>Nama yang dilihat pelanggan. Minimal 3 karakter.</p>
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
                <p className={HINT_CLASS}>
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
                <label htmlFor="pic_name" className={LABEL_CLASS}>
                  Nama Penanggung Jawab (PIC)
                </label>
                <p className={HINT_CLASS}>
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="npwp" className={LABEL_CLASS}>
                    NPWP Badan Usaha <span className="font-normal text-brand-gray-450">(opsional)</span>
                  </label>
                  <input
                    id="npwp"
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    className={INPUT_CLASS}
                    placeholder="15 atau 16 digit"
                    value={vendor.npwp}
                    onChange={(e) => setVendor({ ...vendor, npwp: e.target.value.replace(/\D/g, '') })}
                  />
                  {isReverify && maskedHints.npwp ? (
                    <p className="mt-1 text-xs text-brand-gray-450">
                      NPWP sudah tersimpan. Biarkan kosong bila tidak berubah.
                    </p>
                  ) : (
                    !npwpValid && <p className="mt-1 text-xs text-brand-error">NPWP harus 15 atau 16 digit.</p>
                  )}
                </div>

                <div>
                  <label htmlFor="nib" className={LABEL_CLASS}>
                    NIB <span className="font-normal text-brand-gray-450">(opsional)</span>
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
                  {!nibValid && <p className="mt-1 text-xs text-brand-error">NIB harus tepat 13 digit.</p>}
                </div>
              </div>

              <p className="rounded-md bg-brand-gray-60 p-3 text-xs leading-relaxed text-brand-gray-700">
                Nomor NPWP dan NIB boleh dikosongkan bila belum di tangan - dokumennya tetap wajib
                diunggah di bawah, dan nomornya bisa dilengkapi kemudian.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

              {/* Dokumen menempel pada data yang dibuktikannya, bukan berdiri
                  sebagai langkah terpisah. */}
              <div className="border-t border-brand-gray-100 pt-4">
                <h3 className="text-sm font-bold text-brand-gray-900">Dokumen Badan Usaha</h3>
                <p className="mt-1 text-xs text-brand-gray-450">
                  Ketiganya wajib. Pastikan terbaca jelas - dokumen buram adalah alasan penolakan
                  paling sering. Maksimal 5MB per berkas.
                </p>
              </div>

              <FilePicker
                id="akta"
                label="Akta Pendirian"
                hint="Akta pendirian beserta perubahan terakhir (bila ada). PDF atau foto."
                file={vendor.akta}
                existingUrl={existingDocs.akta_url}
                accept="image/*,application/pdf"
                error={fileErrors.akta}
                onChange={(e) => handleVendorFile(e, 'akta')}
              />

              <FilePicker
                id="npwp_doc"
                label="NPWP Badan Usaha"
                hint="Kartu NPWP atas nama badan usaha, bukan NPWP pribadi PIC."
                file={vendor.npwp_doc}
                existingUrl={existingDocs.npwp_doc_url}
                accept="image/*,application/pdf"
                error={fileErrors.npwp_doc}
                onChange={(e) => handleVendorFile(e, 'npwp_doc')}
              />

              <FilePicker
                id="nib_doc"
                label="NIB / Izin Usaha"
                hint="Dokumen NIB dari sistem OSS."
                file={vendor.nib_doc}
                existingUrl={existingDocs.nib_doc_url}
                accept="image/*,application/pdf"
                error={fileErrors.nib_doc}
                onChange={(e) => handleVendorFile(e, 'nib_doc')}
              />
            </div>
          )}

          {currentStep === 'identity' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className={STEP_TITLE_CLASS}>
                {isVendor ? 'Identitas Penanggung Jawab' : 'Identitas Dasar'}
              </h2>
              <p className="text-sm text-brand-gray-700">
                {isVendor
                  ? 'KTP penanggung jawab, bukan dokumen perusahaan. Yang memegang akun, menerima OTP, dan bertanggung jawab atas pekerjaan tetaplah orang.'
                  : 'Nomor dan foto KTP dipakai tim kami untuk memastikan kamu orang yang sama. Data ini tidak pernah ditampilkan ke pelanggan.'}
              </p>

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
                  <p className="mt-1 text-xs text-brand-gray-450">
                    NIK tercatat: {maskedHints.ktp} - ketik ulang lengkap untuk memastikan identitas.
                  </p>
                )}
              </div>

              <FilePicker
                id="ktp_photo"
                label="Foto KTP"
                hint="Seluruh kartu masuk frame, tanpa pantulan cahaya. Maksimal 5MB."
                file={formData.ktp_photo}
                existingUrl={isReverify ? existingPhotos.ktp_photo_url : ''}
                accept="image/*"
                error={fileErrors.ktp_photo}
                onChange={(e) => handleFileChange(e, 'ktp_photo')}
              />

              <FilePicker
                id="selfie_ktp"
                label="Selfie dengan KTP"
                hint="Wajahmu dan KTP terlihat jelas dalam satu foto."
                file={formData.selfie_ktp}
                existingUrl={isReverify ? existingPhotos.selfie_ktp_url : ''}
                accept="image/*"
                error={fileErrors.selfie_ktp}
                onChange={(e) => handleFileChange(e, 'selfie_ktp')}
              />
            </div>
          )}

          {currentStep === 'profile' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className={STEP_TITLE_CLASS}>Profil Profesional</h2>
              <p className="text-sm text-brand-gray-700">
                Bagian ini yang dilihat pelanggan sebelum memesan. Foto dan nama yang jelas jauh
                lebih sering dipilih.
              </p>

              <div className="flex items-center gap-4 rounded-md bg-brand-gray-60 p-3">
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Foto profil"
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-full border border-brand-gray-100 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-brand-gray-200 bg-white">
                      <User className="h-8 w-8 text-brand-gray-200" aria-hidden />
                    </div>
                  )}
                  {avatarUrl && (
                    <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5">
                      <CheckCircle2 className="h-5 w-5 text-brand-success" aria-hidden />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="avatar" className="text-sm font-semibold text-brand-gray-900">
                    Foto Profil
                  </label>
                  <p className="mt-0.5 text-xs text-brand-gray-450">
                    Wajah atau logo usaha. JPG/PNG, maksimal 5MB.
                  </p>
                  <label
                    htmlFor="avatar"
                    className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-brand-gray-100 bg-white px-3 py-2 text-xs font-bold text-brand-red hover:bg-brand-gray-60"
                  >
                    <Camera className="h-4 w-4" aria-hidden />
                    {avatarUploading ? 'Mengunggah…' : avatarUrl ? 'Ganti Foto' : 'Pilih Foto'}
                  </label>
                  <input
                    id="avatar"
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleAvatarChange}
                  />
                  {avatarError && <p className="mt-1 text-xs text-brand-error">{avatarError}</p>}
                </div>
              </div>

              {isVendor ? (
                <div>
                  <span className={LABEL_CLASS}>Nama Tampil</span>
                  <p className="rounded-md border border-brand-gray-100 bg-brand-gray-60 p-3 text-sm text-brand-gray-700">
                    {vendor.display_name || '.'}
                  </p>
                  <p className="mt-1 text-xs text-brand-gray-450">
                    Diambil dari langkah Data Badan Usaha. Kembali ke langkah itu untuk mengubahnya.
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="display_name_individual" className={LABEL_CLASS}>
                    Nama Tampil
                  </label>
                  <p className={HINT_CLASS}>
                    Nama ini yang muncul di hasil pencarian dan halaman profilmu. Minimal 3 karakter.
                  </p>
                  <input
                    id="display_name_individual"
                    type="text"
                    maxLength={100}
                    className={INPUT_CLASS}
                    placeholder="Contoh: Budi Santoso"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label htmlFor="bio" className={LABEL_CLASS}>
                  Deskripsi / Pengalaman <span className="font-normal text-brand-gray-450">(opsional)</span>
                </label>
                <textarea
                  id="bio"
                  maxLength={500}
                  className={`${INPUT_CLASS} h-24 resize-none`}
                  placeholder={
                    isVendor
                      ? 'Ceritakan bidang usaha, pengalaman, dan kapasitas tim Anda...'
                      : 'Ceritakan pengalaman dan keahlian Anda...'
                  }
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
                <p className="mt-1 text-right text-xs text-brand-gray-450">{formData.bio.length}/500</p>
              </div>
            </div>
          )}

          {currentStep === 'expertise' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className={STEP_TITLE_CLASS}>Keahlian &amp; Bidang Jasa</h2>
              <p className="text-sm text-brand-gray-700">
                Kategori menentukan jasa apa yang boleh kamu jual. Foto alat &amp; bahan dipakai admin
                untuk memastikan kamu memang bisa mengerjakannya. Mengganti atau menambah kategori
                nanti perlu persetujuan admin.
              </p>

              {keptCategories.length > 0 && expertise.length === 0 && (
                <div className="rounded-md border border-brand-gray-100 bg-brand-gray-60 p-3">
                  <p className="text-sm font-semibold text-brand-gray-900">Kategori saat ini</p>
                  <p className="mt-0.5 text-xs text-brand-gray-700">
                    {keptCategories.map((c) => c.category_name).join(', ')}
                  </p>
                  <p className="mt-1 text-xs text-brand-gray-450">
                    Dipertahankan apa adanya. Isi di bawah hanya bila kamu ingin menggantinya.
                  </p>
                </div>
              )}

              {expertise.map((row, idx) => (
                <div key={idx} className="rounded-md border border-brand-gray-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <label htmlFor={`expertise-cat-${idx}`} className={LABEL_CLASS}>
                      Kategori {categoryQuota > 1 ? idx + 1 : ''}
                    </label>
                    {expertise.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setExpertise((prev) => prev.filter((_, i) => i !== idx));
                          // Pesan galat dikunci ke INDEKS baris; setelah baris
                          // dibuang indeksnya bergeser, jadi pesan lama akan
                          // menempel di kategori yang salah.
                          setEvidenceErrors({});
                        }}
                        className="text-xs font-bold text-brand-error"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <select
                    id={`expertise-cat-${idx}`}
                    className={INPUT_CLASS}
                    value={row.category_id}
                    onChange={(e) =>
                      setExpertise((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, category_id: e.target.value } : r)),
                      )
                    }
                  >
                    <option value="">Pilih kategori</option>
                    {(mainCategories ?? [])
                      // Kategori yang sudah dipilih di baris lain tidak ditawarkan:
                      // dua slot berisi kategori sama adalah satu slot terbuang,
                      // dan server menolaknya dengan CATEGORY_DUPLICATE.
                      .filter(
                        (c) => c.id === row.category_id || !expertise.some((e) => e.category_id === c.id),
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>

                  <label htmlFor={`expertise-files-${idx}`} className={`${LABEL_CLASS} mt-3`}>
                    Foto Alat &amp; Bahan <span className="text-brand-red">*</span>
                  </label>
                  <p className={HINT_CLASS}>
                    Wajib 1–5 foto, JPG/PNG maksimal 5MB per foto. Contoh: mesin, perkakas, atau bahan yang kamu pakai.
                  </p>
                  <PhotoPicker
                    id={`expertise-files-${idx}`}
                    files={row.files}
                    max={MAX_EVIDENCE_PHOTOS}
                    error={evidenceErrors[idx]}
                    onPick={(list) => handleEvidencePick(idx, list)}
                    onRemove={(fileIdx) =>
                      setExpertise((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, files: r.files.filter((_, k) => k !== fileIdx) } : r,
                        ),
                      )
                    }
                  />
                </div>
              ))}

              {expertise.length < categoryQuota && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setExpertise((prev) => [...prev, { category_id: '', files: [] }])}
                >
                  {expertise.length === 0 ? 'Pilih Kategori Jasa' : 'Tambah Kategori'}
                </Button>
              )}

              <p className="text-xs text-brand-gray-450">
                Jatahmu {categoryQuota} kategori{isVendor ? ' (badan usaha)' : ' (perorangan)'}.
                {isVendor ? '' : ' Butuh lebih? Ajukan setelah akunmu disetujui.'}
              </p>
            </div>
          )}

          {currentStep === 'location' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className={STEP_TITLE_CLASS}>
                {isVendor ? 'Lokasi Kantor / Basecamp' : 'Lokasi Basecamp'}
              </h2>
              <p className="text-sm text-brand-gray-700">
                Tentukan lokasi tempat Anda bekerja (basecamp) di peta. Jarak pesanan dihitung dari lokasi ini.
              </p>

              <div className="relative h-64 overflow-hidden rounded-md border border-brand-gray-100">
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
                  Detail Alamat <span className="font-normal text-brand-gray-450">(opsional)</span>
                </label>
                <input
                  id="address_detail"
                  className={INPUT_CLASS}
                  placeholder="Nama jalan, patokan, dsb."
                  value={formData.address_detail}
                  onChange={(e) => setFormData({ ...formData, address_detail: e.target.value })}
                />
              </div>
            </div>
          )}

          {currentStep === 'bank' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className={STEP_TITLE_CLASS}>Rekening Pencairan</h2>
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
                  <p className="mt-1 text-xs text-brand-gray-450">
                    Rekening tercatat: {maskedHints.bank} - ketik ulang lengkap untuk memastikan tujuan pencairan.
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
                {/* AUDIT #2 / Fase 2b: sinyal risiko vendor . nama rekening ≠
                    legal_entity_name. Bukan disable submit (§10a: sinyal, bukan
                    gerbang). Pengajuan tetap lolos, ditinjau manual. */}
                {isVendor &&
                  formData.bank_account_name.trim() &&
                  vendor.legal_entity_name.trim() &&
                  formData.bank_account_name.trim().toUpperCase() !==
                  vendor.legal_entity_name.trim().toUpperCase() && (
                    <p className="mt-1.5 rounded-md border border-brand-warning-border bg-brand-warning-soft px-2 py-1.5 text-xs text-brand-warning-dark">
                      Nama rekening berbeda dari nama badan usaha. Pengajuan akan
                      ditinjau manual - sebaiknya gunakan rekening atas nama badan usaha.
                    </p>
                  )}
              </div>
              {/* Komisi & batas tarik ditampilkan DI SINI, di titik mitra
                  menyetujui . angkanya dari platform_settings, bukan diketik.
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
                    <p className="pt-1 text-[11px] leading-relaxed text-brand-gray-700">
                      Sebagai Mitra Badan Usaha, kamu bertanggung jawab penuh atas personel yang kamu
                      tugaskan ke lokasi pelanggan.
                    </p>
                  )}
                  <p className="pt-1 text-[11px] leading-relaxed text-brand-gray-450">
                    Tarif dapat berubah sewaktu-waktu; perubahan diumumkan di platform. Pembayaran di luar
                    platform dilarang.
                  </p>
                </div>
              </LegalConsentCheckbox>
            </div>
          )}
        </div>
      </MitraPageContainer>

      {/* Satu bilah aksi untuk semua langkah. Sebelumnya tiap langkah menyimpan
          tombolnya sendiri di dalam badan kartu dan tidak satu pun punya jalan
          mundur . satu-satunya cara kembali adalah chevron kecil di header. */}
      {/* Bilah aksi fixed = terpusat pada VIEWPORT, sedangkan konten bergeser
          saat sidebar mitra tampil (kasus pengajuan ulang oleh mitra ditolak).
          `lg:left-60` menggeser bilahnya, `contentClassName` menyamakan lebar
          isinya dengan MitraPageContainer variant="form". */}
      <StickyActionBar
        desktop
        className={isPartnerMode ? 'lg:left-60' : undefined}
        contentClassName="max-w-2xl"
      >
        {stepIndex > 0 && (
          <Button variant="outline" className="flex-1" onClick={prevStep} disabled={loading}>
            Kembali
          </Button>
        )}
        <Button
          className="flex-[2]"
          onClick={isLastStep ? handleSubmit : nextStep}
          disabled={!canProceed}
        >
          {isLastStep ? submitLabel : 'Selanjutnya'}
        </Button>
      </StickyActionBar>

      <MitraModal
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Keluar dari pendaftaran?"
        description="Isian yang sudah kamu masukkan tidak disimpan dan harus diulang dari awal."
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={() => setShowExitConfirm(false)}>
              Lanjut Mengisi
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                // Keluar yang DIKONFIRMASI membuang draf . sesuai janji teks
                // modal bahwa isian harus diulang dari awal.
                try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* abaikan */ }
                router.back();
              }}
            >
              Keluar
            </Button>
          </>
        }
      />
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
