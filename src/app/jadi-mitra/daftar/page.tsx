'use client';

/**
 * /jadi-mitra/daftar . pendaftaran mitra SATU ATAP (2026-08-13).
 *
 * Satu halaman mengumpulkan SEMUA yang dibutuhkan sampai mitra bisa transaksi:
 * akun, KYC, lokasi basecamp, kategori jasa + bukti, layanan pertama, dan
 * rekening. Rantai submit-nya:
 *
 *   1. POST /auth/register/quick   . buat akun TANPA OTP, langsung masuk
 *      (dilewati bila pengunjung sudah login)
 *   2. /upload/presign + confirm   . KTP, swafoto, dokumen badan usaha, bukti
 *   3. POST /partners/onboarding/express . mitra pending + jam kerja default
 *      + layanan pertama, dalam satu panggilan
 *
 * Persetujuan tetap milik admin (gate V4: dokumen wajib APPROVED). Halaman ini
 * hanya memangkas jumlah layar . bukan melonggarkan verifikasi.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CheckCircle2, MapPin } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';
import { useAuthStore } from '@/lib/store/authStore';
import { uploadFileToS3 } from '@/hooks/useUpload';
import { useCategories, useSubcategories } from '@/hooks/useCategories';
import { useActiveLegalDocuments } from '@/hooks/useLegalConsent';
import RegionSelect, { type RegionValue } from '@/components/ui/RegionSelect';
import PhotoPickerBox, { type PhotoPickerItem } from '@/components/mitra/PhotoPickerBox';
import LegalConsentCheckbox from '@/components/auth/LegalConsentCheckbox';
import { track } from '@/lib/analytics';

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full animate-pulse items-center justify-center rounded-lg bg-brand-gray-60">
      <MapPin className="h-8 w-8 text-brand-gray-300" />
    </div>
  ),
});

const INPUT_CLASS =
  'w-full rounded-md border border-brand-gray-100 bg-white p-3 text-sm text-brand-gray-900 placeholder:text-brand-gray-450 focus:outline-none focus:border-brand-red';
const LABEL_CLASS = 'mb-2 block text-sm font-semibold text-brand-gray-900';
const SECTION_CLASS = 'space-y-4 rounded-2xl border border-brand-gray-100 bg-white p-4 lg:p-6';
/** Judul section: nomor urut + garis bawah, supaya tiap bagian terpisah tegas. */
const SECTION_TITLE_CLASS = 'border-b border-brand-gray-100 pb-3 text-base font-bold text-brand-gray-900';

const ENTITY_FORMS = [
  { value: 'PT', label: 'PT (Perseroan Terbatas)' },
  { value: 'CV', label: 'CV (Commanditaire Vennootschap)' },
  { value: 'UD', label: 'UD (Usaha Dagang)' },
  { value: 'FIRMA', label: 'Firma' },
  { value: 'KOPERASI', label: 'Koperasi' },
  { value: 'YAYASAN', label: 'Yayasan' },
  { value: 'PERKUMPULAN', label: 'Perkumpulan' },
];

const UNIT_OPTIONS = [
  { value: 'per_service', label: 'Per jasa' },
  { value: 'per_hour', label: 'Per jam' },
  { value: 'per_unit', label: 'Per unit' },
  { value: 'per_kg', label: 'Per kg' },
];

const BANK_OPTIONS = ['BCA', 'MANDIRI', 'BNI', 'BRI', 'BSI'];

/** Kuota kategori utama per tipe . cermin aturan backend (000080): 1 perorangan, 3 vendor. */
const quotaFor = (t: 'individual' | 'vendor') => (t === 'vendor' ? 3 : 1);
const MAX_EVIDENCE_PHOTOS = 5;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

type SubmitStage = 'idle' | 'account' | 'files' | 'submit' | 'photos' | 'done';

/**
 * Satu grup pilihan per kategori utama yang diklaim: kategori utamanya sendiri
 * (umum) + subkategorinya. Layanan memang seharusnya menempel ke SUBKATEGORI
 * bila ada . kategori utama saja terlalu lebar untuk etalase. Gate slot backend
 * (assertServiceCategoryAllowed) memeriksa induknya, jadi subkategori dari
 * kategori yang diklaim tetap sah.
 */
function ServiceCategoryGroup({ mainId, label }: { mainId: string; label: string }) {
  const { data: subs } = useSubcategories(mainId);
  return (
    <optgroup label={label}>
      <option value={mainId}>{label} . Umum</option>
      {(subs ?? []).map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </optgroup>
  );
}

export default function QuickRegisterPage() {
  const router = useRouter();
  const { user, isAuthenticated, login } = useAuthStore();
  const { data: categories } = useCategories();
  const { data: legalDocs } = useActiveLegalDocuments();

  // ── Akun ──
  const [account, setAccount] = useState({ name: '', username: '', phone: '', email: '', password: '' });
  // ── Tipe & badan usaha ──
  const [partnerType, setPartnerType] = useState<'individual' | 'vendor'>('individual');
  const [vendor, setVendor] = useState({
    display_name: '', legal_entity_name: '', entity_form: 'PT',
    npwp: '', nib: '', pic_name: '', pic_position: '', business_phone: '', business_email: '',
  });
  const [vendorDocs, setVendorDocs] = useState<{ akta: File | null; npwp: File | null; nib: File | null }>({
    akta: null, npwp: null, nib: null,
  });
  // ── Identitas ──
  const [ktpNumber, setKtpNumber] = useState('');
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  // ── Profil & lokasi ──
  const [bio, setBio] = useState('');
  const [region, setRegion] = useState<RegionValue>({ province: '', city: '', district: '' });
  const [addressDetail, setAddressDetail] = useState('');
  const [basecamp, setBasecamp] = useState({ lat: -6.2, lon: 106.816666 });
  const [basecampTouched, setBasecampTouched] = useState(false);
  // ── Keahlian: kategori utama + bukti foto per kategori ──
  const [chosenCats, setChosenCats] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<Record<string, File[]>>({});
  // ── Layanan pertama ──
  const [service, setService] = useState({
    category_id: '', name: '', description: '', price: '',
    unit: 'per_service', estimated_duration: '60', min_order: '1',
    included_items: '', excluded_items: '',
  });
  // Foto produk jasa. Etalase tanpa foto nyaris tidak pernah dilirik pelanggan,
  // jadi minimal 1 wajib . dilampirkan setelah layanan terbuat (butuh id-nya).
  const [servicePhotos, setServicePhotos] = useState<File[]>([]);
  // ── Rekening (wajib: tujuan pencairan) ──
  const [bank, setBank] = useState({ bank_code: '', bank_account_number: '', bank_account_name: '' });
  const [agreed, setAgreed] = useState(false);

  const [stage, setStage] = useState<SubmitStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [serviceWarning, setServiceWarning] = useState<string | null>(null);

  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track('partner_quick_register_viewed');
  }, []);

  const alreadyPartner = !!user?.partner_id;
  const needAccount = !isAuthenticated;
  const isVendor = partnerType === 'vendor';
  const quota = quotaFor(partnerType);

  // Bukti per kategori sebagai item pratinjau. URL objek dibangun sekali per
  // perubahan daftar berkas (useMemo) dan dicabut saat diganti . membangunnya
  // di badan render akan menumpuk blob URL baru pada tiap ketikan di form.
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
  const evidenceItems = (catId: string): PhotoPickerItem[] => evidenceUrlMap[catId] ?? [];

  // Pratinjau foto layanan . pola memo+revoke yang sama dengan bukti kategori.
  const servicePhotoItems = useMemo(
    () => servicePhotos.map((f) => ({ key: `svc-${f.name}-${f.size}-${f.lastModified}`, src: URL.createObjectURL(f) })),
    [servicePhotos],
  );
  useEffect(
    () => () => {
      for (const item of servicePhotoItems) URL.revokeObjectURL(item.src);
    },
    [servicePhotoItems],
  );

  const toggleCat = (id: string) => {
    setChosenCats((prev) => {
      if (prev.includes(id)) {
        setEvidence((ev) => {
          const next = { ...ev };
          delete next[id];
          return next;
        });
        return prev.filter((c) => c !== id);
      }
      if (prev.length >= quota) return prev;
      return [...prev, id];
    });
  };

  // Kategori layanan pertama dibatasi pada kategori yang diklaim . slot gate
  // backend (assertServiceCategoryAllowed) menolak kategori di luar itu.

  const validate = (): string | null => {
    if (needAccount) {
      if (!account.name.trim()) return 'Nama lengkap wajib diisi';
      if (!/^[a-z0-9_]{4,30}$/.test(account.username.trim()))
        return 'Username harus 4-30 karakter: huruf kecil, angka, atau underscore';
      if (!account.phone.trim()) return 'Nomor HP wajib diisi';
      if (account.password.length < 8) return 'Password minimal 8 karakter';
    }
    if (!/^\d{16}$/.test(ktpNumber.trim())) return 'NIK KTP harus tepat 16 digit angka';
    if (!ktpFile) return 'Foto KTP wajib diunggah';
    if (!selfieFile) return 'Swafoto dengan KTP wajib diunggah';
    if (isVendor) {
      if (!vendor.display_name.trim() || !vendor.legal_entity_name.trim() || !vendor.pic_name.trim())
        return 'Badan usaha: nama tampil, nama legal, dan nama PIC wajib diisi';
      if (!vendorDocs.akta || !vendorDocs.npwp || !vendorDocs.nib)
        return 'Badan usaha: akta pendirian, NPWP badan, dan NIB wajib diunggah';
    }
    if (!region.province || !region.city || !region.district)
      return 'Provinsi, kota, dan kecamatan wajib dipilih';
    if (!basecampTouched) return 'Tandai lokasi basecamp di peta (geser pin ke lokasi kerjamu)';
    if (chosenCats.length === 0) return 'Pilih minimal 1 kategori jasa';
    for (const c of chosenCats) {
      if ((evidence[c] ?? []).length === 0)
        return `Unggah minimal 1 foto alat & bahan untuk tiap kategori`;
    }
    if (!service.category_id) return 'Pilih kategori untuk layanan pertamamu';
    if (!service.name.trim()) return 'Nama layanan wajib diisi';
    if (!(Number(service.price) > 0)) return 'Harga layanan harus lebih dari 0';
    if (servicePhotos.length === 0) return 'Unggah minimal 1 foto produk jasamu';
    if (!service.included_items.trim() || !service.excluded_items.trim())
      return 'Isi minimal satu baris "harga termasuk" dan "tidak termasuk"';
    if (!bank.bank_code || !bank.bank_account_number.trim() || !bank.bank_account_name.trim())
      return 'Rekening bank wajib lengkap . ke sana hasil kerjamu dicairkan';
    if (!agreed) return 'Centang persetujuan S&K terlebih dahulu';
    return null;
  };

  const pickFile = (setter: (f: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_UPLOAD_BYTES) {
      setError('Ukuran file maksimal 5MB');
      return;
    }
    setError(null);
    setter(f);
  };

  const handleSubmit = async () => {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError(null);
    setServiceWarning(null);

    try {
      // 1. Akun (dilewati bila pengunjung sudah login).
      if (needAccount) {
        setStage('account');
        const res = await fetchAPI<{ access_token: string; user: any }>('/auth/register/quick', {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            username: account.username.trim(),
            name: account.name.trim(),
            phone: account.phone.trim(),
            email: account.email.trim(),
            password: account.password,
          }),
        });
        if (!res.success || !res.data) throw new Error(getErrorMessage(res));
        login(res.data.user, res.data.access_token);
      }

      // 2. Berkas.
      setStage('files');
      const ktpUrl = await uploadFileToS3(ktpFile!, 'ktp');
      const selfieUrl = await uploadFileToS3(selfieFile!, 'selfie');
      let vendorDocUrls = { akta_url: '', npwp_doc_url: '', nib_doc_url: '' };
      if (isVendor) {
        vendorDocUrls = {
          akta_url: await uploadFileToS3(vendorDocs.akta!, 'documents'),
          npwp_doc_url: await uploadFileToS3(vendorDocs.npwp!, 'documents'),
          nib_doc_url: await uploadFileToS3(vendorDocs.nib!, 'documents'),
        };
      }
      const mainCategoriesPayload = [];
      for (const catId of chosenCats) {
        const urls: string[] = [];
        for (const file of evidence[catId] ?? []) {
          urls.push(await uploadFileToS3(file, 'category-evidence'));
        }
        mainCategoriesPayload.push({ category_id: catId, evidence_urls: urls });
      }

      // 3. Pendaftaran + layanan pertama dalam satu panggilan.
      setStage('submit');
      const legalDocumentIds = (legalDocs || [])
        .filter((d) => d.slug === 'terms' || d.slug === 'privacy')
        .map((d) => d.id);

      const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
      const res = await fetchAPI<{ service_created: boolean; service_error?: string; service_id?: string }>(
        '/partners/onboarding/express',
        {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            partner_type: partnerType,
            ktp_number: ktpNumber.trim(),
            ktp_photo_url: ktpUrl,
            selfie_ktp_url: selfieUrl,
            bio: bio.trim(),
            service_area: [[region.district, region.city].filter(Boolean).join(', ') || 'general'],
            province: region.province,
            city: region.city,
            district: region.district,
            address_detail: addressDetail.trim(),
            basecamp_lat: basecamp.lat,
            basecamp_lon: basecamp.lon,
            bank_code: bank.bank_code,
            bank_account_number: bank.bank_account_number.trim(),
            bank_account_name: bank.bank_account_name.trim(),
            legal_document_ids: legalDocumentIds,
            main_categories: mainCategoriesPayload,
            ...(isVendor
              ? {
                  display_name: vendor.display_name.trim(),
                  legal_entity_name: vendor.legal_entity_name.trim(),
                  entity_form: vendor.entity_form,
                  npwp: vendor.npwp.trim(),
                  nib: vendor.nib.trim(),
                  pic_name: vendor.pic_name.trim(),
                  pic_position: vendor.pic_position.trim(),
                  business_phone: vendor.business_phone.trim(),
                  business_email: vendor.business_email.trim(),
                  ...vendorDocUrls,
                }
              : {}),
            service: {
              category_id: service.category_id,
              name: service.name.trim(),
              description: service.description.trim(),
              price: Number(service.price),
              included_items: lines(service.included_items),
              excluded_items: lines(service.excluded_items),
              unit: service.unit,
              estimated_duration: Number(service.estimated_duration) || 60,
              min_order: Number(service.min_order) || 1,
            },
          }),
        },
      );
      if (!res.success) throw new Error(getErrorMessage(res));
      if (res.data && res.data.service_created === false) {
        setServiceWarning(res.data.service_error || 'Layanan pertama gagal dibuat');
      }

      // 4. Foto layanan menyusul: butuh id layanan yang baru lahir. Kegagalan
      // di sini tidak menggagalkan pendaftaran . fotonya bisa ditambah dari
      // menu Layanan.
      const svcId = res.data?.service_id;
      if (res.data?.service_created && svcId && servicePhotos.length > 0) {
        setStage('photos');
        try {
          for (const f of servicePhotos) {
            const url = await uploadFileToS3(f, 'service');
            const photoRes = await fetchAPI(`/partners/me/services/${svcId}/photos`, {
              method: 'POST',
              credentials: 'include',
              body: JSON.stringify({ photo_url: url }),
            });
            if (!photoRes.success) throw new Error(getErrorMessage(photoRes));
          }
        } catch {
          setServiceWarning('Layanan terbuat, tetapi fotonya gagal diunggah. Tambahkan dari menu Layanan.');
        }
      }

      track('partner_quick_register_submitted');
      setStage('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan. Coba lagi.');
      setStage('idle');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ── Layar sukses ──
  if (stage === 'done') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-brand-gray-100 bg-white p-6 text-center lg:p-10">
          <CheckCircle2 className="mx-auto h-14 w-14 text-brand-success" />
          <h1 className="mt-4 text-xl font-bold text-brand-gray-900">Pendaftaran Terkirim</h1>
          <p className="mt-2 text-sm leading-relaxed text-brand-gray-700">
            Datamu sedang ditinjau tim kami. Begitu disetujui, layananmu langsung tayang dan bisa
            menerima pesanan . jam kerja sementara diset <b>setiap hari 08.00–17.00</b> dan bisa
            kamu ubah kapan pun dari menu Jadwal.
          </p>
          {serviceWarning && (
            <p className="mt-3 rounded-lg border border-brand-warning-border bg-brand-warning-soft p-3 text-xs text-brand-gray-700">
              Layanan pertama belum terbuat ({serviceWarning}). Tambahkan dari menu Layanan setelah masuk.
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => router.push('/mitra/verification-status')}
              className="rounded-md bg-brand-red px-6 py-3 text-sm font-bold text-white hover:bg-brand-red-dark"
            >
              Lihat Status Verifikasi
            </button>
            <button
              onClick={() => router.push('/mitra/services')}
              className="rounded-md border border-brand-gray-100 bg-white px-6 py-3 text-sm font-bold text-brand-gray-900 hover:border-brand-red hover:text-brand-red"
            >
              Kelola Layanan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Sudah jadi mitra ──
  if (alreadyPartner) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-brand-gray-900">Kamu Sudah Terdaftar sebagai Mitra</h1>
        <p className="mt-2 text-sm text-brand-gray-700">
          Akun ini sudah punya profil mitra. Kelola layanan dan jadwalmu dari area mitra.
        </p>
        <button
          onClick={() => router.push('/mitra')}
          className="mt-6 rounded-md bg-brand-red px-6 py-3 text-sm font-bold text-white hover:bg-brand-red-dark"
        >
          Buka Area Mitra
        </button>
      </div>
    );
  }

  const busy = stage !== 'idle';
  const busyLabel =
    stage === 'account' ? 'Membuat akun…'
      : stage === 'files' ? 'Mengunggah berkas…'
        : stage === 'submit' ? 'Mengirim pendaftaran…'
          : stage === 'photos' ? 'Mengunggah foto layanan…' : '';

  // Nomor section berurut. Bagian Akun hanya ada untuk pengunjung yang belum
  // login, jadi nomornya dihitung, bukan diketik tetap.
  let secNo = 0;
  const secNum = {
    account: needAccount ? ++secNo : 0,
    type: ++secNo,
    identity: ++secNo,
    location: ++secNo,
    category: ++secNo,
    service: ++secNo,
    bank: ++secNo,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-gray-900">Daftar Jadi Mitra</h1>
        <p className="mt-1 text-sm leading-relaxed text-brand-gray-700">
          Satu formulir, langsung lengkap: akun, identitas, kategori jasa, dan layanan pertamamu.
          Tim kami meninjau dan menyetujui pendaftaranmu . setelah itu layananmu langsung bisa
          dipesan. Sudah punya akun?{' '}
          <Link href="/login?redirect=/jadi-mitra/daftar" className="font-semibold text-brand-red">
            Masuk dulu
          </Link>{' '}
          supaya tidak perlu mengisi bagian akun.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-brand-error-border bg-brand-error-soft p-3 text-sm text-brand-error">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* ── Akun ── */}
        {needAccount && (
          <section className={SECTION_CLASS}>
            <h2 className={SECTION_TITLE_CLASS}>{secNum.account}. Akun</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="qr-name" className={LABEL_CLASS}>Nama lengkap *</label>
                <input id="qr-name" className={INPUT_CLASS} value={account.name}
                  onChange={(e) => setAccount({ ...account, name: e.target.value })} />
              </div>
              <div>
                <label htmlFor="qr-username" className={LABEL_CLASS}>Username *</label>
                <input id="qr-username" className={INPUT_CLASS} value={account.username}
                  autoComplete="off" placeholder="huruf kecil, tanpa spasi"
                  onChange={(e) => setAccount({ ...account, username: e.target.value.toLowerCase() })} />
              </div>
              <div>
                <label htmlFor="qr-phone" className={LABEL_CLASS}>Nomor HP *</label>
                <input id="qr-phone" className={INPUT_CLASS} inputMode="tel" value={account.phone}
                  placeholder="08xx" onChange={(e) => setAccount({ ...account, phone: e.target.value })} />
              </div>
              <div>
                <label htmlFor="qr-email" className={LABEL_CLASS}>Email (opsional)</label>
                <input id="qr-email" type="email" className={INPUT_CLASS} value={account.email}
                  onChange={(e) => setAccount({ ...account, email: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="qr-password" className={LABEL_CLASS}>Password *</label>
                <input id="qr-password" type="password" className={INPUT_CLASS} value={account.password}
                  autoComplete="new-password" placeholder="Minimal 8 karakter"
                  onChange={(e) => setAccount({ ...account, password: e.target.value })} />
              </div>
            </div>
          </section>
        )}

        {/* ── Tipe mitra ── */}
        <section className={SECTION_CLASS}>
          <h2 className={SECTION_TITLE_CLASS}>{secNum.type}. Tipe Pendaftar</h2>
          <div className="flex gap-3">
            {(['individual', 'vendor'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setPartnerType(t); setChosenCats([]); setEvidence({}); setService({ ...service, category_id: '' }); }}
                className={`flex-1 rounded-md border p-3 text-sm font-semibold transition-colors ${
                  partnerType === t
                    ? 'border-brand-red bg-brand-red-soft text-brand-red'
                    : 'border-brand-gray-100 bg-white text-brand-gray-700 hover:border-brand-red'
                }`}
              >
                {t === 'individual' ? 'Perorangan' : 'Badan Usaha (PT/CV/dll)'}
              </button>
            ))}
          </div>

          {isVendor && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="qr-display" className={LABEL_CLASS}>Nama tampil usaha *</label>
                  <input id="qr-display" className={INPUT_CLASS} value={vendor.display_name}
                    onChange={(e) => setVendor({ ...vendor, display_name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="qr-legal" className={LABEL_CLASS}>Nama legal badan usaha *</label>
                  <input id="qr-legal" className={INPUT_CLASS} value={vendor.legal_entity_name}
                    onChange={(e) => setVendor({ ...vendor, legal_entity_name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="qr-entity" className={LABEL_CLASS}>Bentuk badan usaha *</label>
                  <select id="qr-entity" className={INPUT_CLASS} value={vendor.entity_form}
                    onChange={(e) => setVendor({ ...vendor, entity_form: e.target.value })}>
                    {ENTITY_FORMS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="qr-pic" className={LABEL_CLASS}>Nama penanggung jawab (PIC) *</label>
                  <input id="qr-pic" className={INPUT_CLASS} value={vendor.pic_name}
                    onChange={(e) => setVendor({ ...vendor, pic_name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="qr-npwp" className={LABEL_CLASS}>NPWP badan (opsional)</label>
                  <input id="qr-npwp" className={INPUT_CLASS} value={vendor.npwp}
                    onChange={(e) => setVendor({ ...vendor, npwp: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="qr-nib" className={LABEL_CLASS}>NIB (opsional)</label>
                  <input id="qr-nib" className={INPUT_CLASS} value={vendor.nib}
                    onChange={(e) => setVendor({ ...vendor, nib: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    { key: 'akta', label: 'Akta Pendirian *' },
                    { key: 'npwp', label: 'Dokumen NPWP Badan *' },
                    { key: 'nib', label: 'Dokumen NIB *' },
                  ] as const
                ).map((d) => (
                  <div key={d.key}>
                    <label htmlFor={`qr-doc-${d.key}`} className={LABEL_CLASS}>{d.label}</label>
                    <input
                      id={`qr-doc-${d.key}`}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                      className="w-full text-xs text-brand-gray-700 file:mr-2 file:rounded-md file:border-0 file:bg-brand-gray-60 file:px-3 file:py-2 file:text-xs file:font-semibold hover:file:bg-brand-gray-100"
                      onChange={pickFile((f) => setVendorDocs((v) => ({ ...v, [d.key]: f })))}
                    />
                    {vendorDocs[d.key] && (
                      <p className="mt-1 truncate text-xs text-brand-gray-450">{vendorDocs[d.key]!.name}</p>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-brand-gray-450">
                KTP di bagian berikutnya adalah KTP penanggung jawab (PIC), bukan &quot;KTP perusahaan&quot;.
              </p>
            </div>
          )}
        </section>

        {/* ── Identitas ── */}
        <section className={SECTION_CLASS}>
          <h2 className={SECTION_TITLE_CLASS}>{secNum.identity}. Identitas {isVendor ? 'PIC ' : ''}(KYC)</h2>
          <div>
            <label htmlFor="qr-ktp" className={LABEL_CLASS}>NIK KTP *</label>
            <input id="qr-ktp" className={INPUT_CLASS} inputMode="numeric" maxLength={16}
              value={ktpNumber} placeholder="16 digit"
              onChange={(e) => setKtpNumber(e.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="qr-ktp-file" className={LABEL_CLASS}>Foto KTP *</label>
              <input id="qr-ktp-file" type="file" accept="image/jpeg,image/png,image/jpg,image/webp"
                className="w-full text-xs text-brand-gray-700 file:mr-2 file:rounded-md file:border-0 file:bg-brand-gray-60 file:px-3 file:py-2 file:text-xs file:font-semibold hover:file:bg-brand-gray-100"
                onChange={pickFile(setKtpFile)} />
              {ktpFile && <p className="mt-1 truncate text-xs text-brand-gray-450">{ktpFile.name}</p>}
            </div>
            <div>
              <label htmlFor="qr-selfie-file" className={LABEL_CLASS}>Swafoto memegang KTP *</label>
              <input id="qr-selfie-file" type="file" accept="image/jpeg,image/png,image/jpg,image/webp"
                className="w-full text-xs text-brand-gray-700 file:mr-2 file:rounded-md file:border-0 file:bg-brand-gray-60 file:px-3 file:py-2 file:text-xs file:font-semibold hover:file:bg-brand-gray-100"
                onChange={pickFile(setSelfieFile)} />
              {selfieFile && <p className="mt-1 truncate text-xs text-brand-gray-450">{selfieFile.name}</p>}
            </div>
          </div>
        </section>

        {/* ── Lokasi & profil ── */}
        <section className={SECTION_CLASS}>
          <h2 className={SECTION_TITLE_CLASS}>{secNum.location}. Lokasi Kerja</h2>
          <RegionSelect value={region} onChange={setRegion} />
          <div>
            <label htmlFor="qr-addr" className={LABEL_CLASS}>Detail alamat</label>
            <input id="qr-addr" className={INPUT_CLASS} value={addressDetail}
              placeholder="Nama jalan, nomor, patokan…"
              onChange={(e) => setAddressDetail(e.target.value)} />
          </div>
          <div>
            <span className={LABEL_CLASS}>Pin basecamp di peta *</span>
            <MapPicker lat={basecamp.lat} lng={basecamp.lon}
              onChange={(lat, lng) => { setBasecamp({ lat, lon: lng }); setBasecampTouched(true); }} />
            <p className="mt-1 text-xs text-brand-gray-450">
              Pelanggan di sekitar titik inilah yang akan menemukanmu. Titik pastinya tidak pernah
              ditampilkan ke publik.
            </p>
          </div>
          <div>
            <label htmlFor="qr-bio" className={LABEL_CLASS}>Tentang kamu / usahamu (opsional)</label>
            <textarea id="qr-bio" className={INPUT_CLASS} rows={3} maxLength={500} value={bio}
              placeholder="Pengalaman, keahlian khusus, garansi…"
              onChange={(e) => setBio(e.target.value)} />
          </div>
        </section>

        {/* ── Kategori + bukti ── */}
        <section className={SECTION_CLASS}>
          <h2 className={SECTION_TITLE_CLASS}>{secNum.category}. Kategori Jasa</h2>
          <p className="text-xs text-brand-gray-450">
            Pilih {quota === 1 ? 'satu' : `sampai ${quota}`} kategori utama, lalu unggah foto alat &
            bahan yang membuktikan (1–{MAX_EVIDENCE_PHOTOS} foto per kategori).
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(categories ?? []).map((c) => {
              const active = chosenCats.includes(c.id);
              const full = !active && chosenCats.length >= quota;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={full}
                  onClick={() => toggleCat(c.id)}
                  className={`rounded-md border p-3 text-left text-sm font-semibold transition-colors ${
                    active
                      ? 'border-brand-red bg-brand-red-soft text-brand-red'
                      : full
                        ? 'cursor-not-allowed border-brand-gray-100 bg-brand-gray-60 text-brand-gray-450'
                        : 'border-brand-gray-100 bg-white text-brand-gray-900 hover:border-brand-red'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
          {chosenCats.map((catId) => {
            const cat = (categories ?? []).find((c) => c.id === catId);
            return (
              <div key={catId}>
                <span className={LABEL_CLASS}>Foto alat & bahan . {cat?.name ?? 'Kategori'} *</span>
                <PhotoPickerBox
                  id={`evidence-${catId}`}
                  items={evidenceItems(catId)}
                  max={MAX_EVIDENCE_PHOTOS}
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onPick={(picked) => {
                    if (!picked) return;
                    const files = Array.from(picked).filter((f) => f.size <= MAX_UPLOAD_BYTES);
                    setEvidence((ev) => ({
                      ...ev,
                      [catId]: [...(ev[catId] ?? []), ...files].slice(0, MAX_EVIDENCE_PHOTOS),
                    }));
                  }}
                  onRemove={(i) =>
                    setEvidence((ev) => ({ ...ev, [catId]: (ev[catId] ?? []).filter((_, idx) => idx !== i) }))
                  }
                />
              </div>
            );
          })}
        </section>

        {/* ── Layanan pertama ── */}
        <section className={SECTION_CLASS}>
          <h2 className={SECTION_TITLE_CLASS}>{secNum.service}. Layanan Pertamamu</h2>
          <p className="text-xs text-brand-gray-450">
            Inilah yang langsung dilihat pelanggan begitu pendaftaranmu disetujui. Kamu bisa menambah
            layanan lain nanti dari area mitra.
          </p>
          {/* Foto sengaja PALING ATAS: etalase tanpa foto nyaris tidak pernah
              dilirik, jadi jangan sampai jadi isian terakhir yang diskip. */}
          <div>
            <span className={LABEL_CLASS}>Foto produk jasa * (1–{MAX_EVIDENCE_PHOTOS} foto)</span>
            <PhotoPickerBox
              id="qr-svc-photos"
              items={servicePhotoItems}
              max={MAX_EVIDENCE_PHOTOS}
              accept="image/jpeg,image/png,image/jpg,image/webp"
              onPick={(picked) => {
                if (!picked) return;
                const files = Array.from(picked).filter((f) => f.size <= MAX_UPLOAD_BYTES);
                setServicePhotos((prev) => [...prev, ...files].slice(0, MAX_EVIDENCE_PHOTOS));
              }}
              onRemove={(i) => setServicePhotos((prev) => prev.filter((_, idx) => idx !== i))}
            />
            <p className="mt-1 text-xs text-brand-gray-450">
              Foto hasil kerja atau suasana pengerjaan, misalnya: kondisi sebelum &amp; sesudah,
              peralatan yang dipakai, atau hasil akhir yang rapi.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="qr-svc-cat" className={LABEL_CLASS}>Kategori layanan *</label>
              <select id="qr-svc-cat" className={INPUT_CLASS} value={service.category_id}
                onChange={(e) => setService({ ...service, category_id: e.target.value })}>
                <option value="">{chosenCats.length === 0 ? 'Pilih kategori jasa dulu di atas' : 'Pilih kategori…'}</option>
                {chosenCats.map((mainId) => (
                  <ServiceCategoryGroup
                    key={mainId}
                    mainId={mainId}
                    label={(categories ?? []).find((c) => c.id === mainId)?.name ?? 'Kategori'}
                  />
                ))}
              </select>
              <p className="mt-1 text-xs text-brand-gray-450">
                Pilih subkategori yang paling spesifik bila ada . pelanggan mencari lewat itu.
              </p>
            </div>
            <div>
              <label htmlFor="qr-svc-name" className={LABEL_CLASS}>Nama layanan *</label>
              <input id="qr-svc-name" className={INPUT_CLASS} value={service.name}
                placeholder="Mis: Servis AC split 1 PK"
                onChange={(e) => setService({ ...service, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="qr-svc-price" className={LABEL_CLASS}>Harga (Rp) *</label>
              <input id="qr-svc-price" className={INPUT_CLASS} inputMode="numeric" value={service.price}
                placeholder="100000"
                onChange={(e) => setService({ ...service, price: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div>
              <label htmlFor="qr-svc-unit" className={LABEL_CLASS}>Satuan *</label>
              <select id="qr-svc-unit" className={INPUT_CLASS} value={service.unit}
                onChange={(e) => setService({ ...service, unit: e.target.value })}>
                {UNIT_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="qr-svc-duration" className={LABEL_CLASS}>Estimasi durasi (menit)</label>
              <input id="qr-svc-duration" className={INPUT_CLASS} inputMode="numeric"
                value={service.estimated_duration}
                onChange={(e) => setService({ ...service, estimated_duration: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div>
              <label htmlFor="qr-svc-min" className={LABEL_CLASS}>Minimal order</label>
              <input id="qr-svc-min" className={INPUT_CLASS} inputMode="numeric" value={service.min_order}
                onChange={(e) => setService({ ...service, min_order: e.target.value.replace(/\D/g, '') })} />
            </div>
          </div>
          <div>
            <label htmlFor="qr-svc-desc" className={LABEL_CLASS}>Deskripsi</label>
            <textarea id="qr-svc-desc" className={INPUT_CLASS} rows={2} value={service.description}
              onChange={(e) => setService({ ...service, description: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="qr-svc-inc" className={LABEL_CLASS}>Harga termasuk * (satu per baris)</label>
              <textarea id="qr-svc-inc" className={INPUT_CLASS} rows={4} value={service.included_items}
                placeholder={'Jasa pengerjaan\nPembersihan area setelah selesai\nGaransi pengerjaan 7 hari\nKonsultasi & pengecekan awal'}
                onChange={(e) => setService({ ...service, included_items: e.target.value })} />
            </div>
            <div>
              <label htmlFor="qr-svc-exc" className={LABEL_CLASS}>Tidak termasuk * (satu per baris)</label>
              <textarea id="qr-svc-exc" className={INPUT_CLASS} rows={4} value={service.excluded_items}
                placeholder={'Sparepart / suku cadang\nPembelian material & bahan\nPerbaikan kerusakan berat yang baru ditemukan di lokasi\nPekerjaan tambahan di luar kesepakatan awal'}
                onChange={(e) => setService({ ...service, excluded_items: e.target.value })} />
            </div>
          </div>
          <p className="text-xs leading-relaxed text-brand-gray-450">
            Contoh <b>termasuk</b>: jasa pengerjaan, pembersihan ringan setelah selesai, garansi,
            konsultasi awal, pengujian hasil kerja. Contoh <b>tidak termasuk</b>: sparepart,
            material/bahan, pembongkaran besar, pekerjaan tambahan di luar kesepakatan. Semakin jelas
            daftarnya, semakin kecil selisih ekspektasi dengan pelanggan . ongkos transport tidak perlu
            ditulis di sini karena sudah dihitung otomatis oleh platform saat pemesanan.
          </p>
        </section>

        {/* ── Rekening ── */}
        <section className={SECTION_CLASS}>
          <h2 className={SECTION_TITLE_CLASS}>{secNum.bank}. Rekening Pencairan</h2>
          {isVendor && (
            <p className="rounded-lg border border-brand-warning-border bg-brand-warning-soft p-3 text-xs text-brand-gray-700">
              Rekening wajib <b>atas nama badan usaha</b>, bukan rekening pribadi PIC. Nama yang tidak
              cocok akan ditolak saat verifikasi.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="qr-bank" className={LABEL_CLASS}>Bank *</label>
              <select id="qr-bank" className={INPUT_CLASS} value={bank.bank_code}
                onChange={(e) => setBank({ ...bank, bank_code: e.target.value })}>
                <option value="">Pilih bank</option>
                {BANK_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="qr-accno" className={LABEL_CLASS}>Nomor rekening *</label>
              <input id="qr-accno" className={INPUT_CLASS} inputMode="numeric" value={bank.bank_account_number}
                onChange={(e) => setBank({ ...bank, bank_account_number: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div>
              <label htmlFor="qr-accname" className={LABEL_CLASS}>Atas nama *</label>
              <input id="qr-accname" className={INPUT_CLASS} value={bank.bank_account_name}
                onChange={(e) => setBank({ ...bank, bank_account_name: e.target.value })} />
            </div>
          </div>
        </section>

        {/* ── Legal + submit ── */}
        <LegalConsentCheckbox checked={agreed} onChange={setAgreed} />

        <button
          type="button"
          disabled={busy}
          onClick={handleSubmit}
          className="h-12 w-full rounded-md bg-brand-red text-base font-bold text-white transition-colors hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? busyLabel : 'Kirim Pendaftaran'}
        </button>
        <p className="text-center text-xs text-brand-gray-450">
          Dengan mengirim, datamu akan ditinjau tim kami. Keputusan persetujuan sepenuhnya di tangan admin.
        </p>
      </div>
    </div>
  );
}
