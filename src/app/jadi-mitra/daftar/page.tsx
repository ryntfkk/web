'use client';

/**
 * /jadi-mitra/daftar . pendaftaran mitra INSTAN (model mitra instan,
 * PLAN-MITRA-INSTAN 2026-08-14; sebelumnya "satu atap" 2026-08-13).
 *
 * TANPA KYC, TANPA rekening, TANPA dokumen badan usaha, TANPA foto bukti
 * kategori . semuanya menyusul lewat wizard /mitra/kyc saat mitra hendak
 * menarik dana. Yang dikumpulkan di sini hanyalah yang dibutuhkan supaya
 * "langsung bisa dipesan" benar sejak detik pertama:
 *
 *   1. POST /auth/register/quick   . buat akun TANPA OTP, langsung masuk
 *      (dilewati bila pengunjung sudah login)
 *   2. POST /partners/onboarding/express . mitra langsung AKTIF + jam kerja
 *      default + kategori + layanan pertama, dalam satu panggilan
 *   3. Upload foto layanan menyusul (butuh id layanan)
 *
 * Profil tampil dengan badge "Belum Terverifikasi" sampai KYC disetujui admin.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CheckCircle2, MapPin, User, Briefcase, Grid as GridIcon, Wrench } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
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
  'w-full rounded-md border border-brand-gray-100 bg-white px-3 py-2.5 sm:p-3 text-sm text-brand-gray-900 placeholder:text-brand-gray-450 focus:outline-none focus:border-brand-red';
const LABEL_CLASS = 'mb-2 block text-sm font-semibold text-brand-gray-900';
const SECTION_CLASS = 'space-y-3 sm:space-y-4 rounded-2xl border border-brand-gray-100 bg-white p-4 sm:p-5 lg:p-6';
/** Judul section: nomor urut + garis bawah, supaya tiap bagian terpisah tegas. */
const SECTION_TITLE_CLASS = 'flex items-center gap-2 border-b border-brand-gray-100 pb-3 text-base font-bold text-brand-gray-900';

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

/** Kuota kategori utama per tipe . cermin aturan backend (000080): 1 perorangan, 3 vendor. */
const quotaFor = (t: 'individual' | 'vendor') => (t === 'vendor' ? 3 : 1);
const MAX_SERVICE_PHOTOS = 5;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

type SubmitStage = 'idle' | 'account' | 'submit' | 'photos' | 'done';

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
  const queryClient = useQueryClient();
  const { user, isAuthenticated, login } = useAuthStore();
  const { data: categories } = useCategories();
  const { data: legalDocs } = useActiveLegalDocuments();
  // Sakelar backend menentukan bentuk pendaftaran yang SAH. false eksplisit =
  // backend masih menuntut KYC penuh → form instan ini pasti ditolak 400 tanpa
  // ada field KTP untuk diisi; arahkan ke wizard lama. undefined = anggap ON
  // (keadaan tunak pasca-rilis; backend tetap penjaga sesungguhnya).
  const instantOff = usePlatformConfig().instant_partner_activation === false;

  // ── Akun ──
  const [account, setAccount] = useState({ name: '', username: '', phone: '', email: '', password: '' });
  // ── Tipe & badan usaha ──
  // Identitas badan usaha TETAP diisi saat daftar (constraint DB
  // chk_partners_vendor_identity menuntutnya); DOKUMEN-nya (akta/NPWP/NIB)
  // yang dipindah ke wizard KYC.
  const [partnerType, setPartnerType] = useState<'individual' | 'vendor'>('individual');
  const [vendor, setVendor] = useState({
    display_name: '', legal_entity_name: '', entity_form: 'PT',
    npwp: '', nib: '', pic_name: '', pic_position: '', business_phone: '', business_email: '',
  });
  // ── Profil & lokasi ──
  const [bio, setBio] = useState('');
  const [region, setRegion] = useState<RegionValue>({ province: '', city: '', district: '' });
  const [addressDetail, setAddressDetail] = useState('');
  const [basecamp, setBasecamp] = useState({ lat: -6.2, lon: 106.816666 });
  const [basecampTouched, setBasecampTouched] = useState(false);
  // ── Keahlian: kategori utama (foto bukti alat menyusul saat KYC) ──
  const [chosenCats, setChosenCats] = useState<string[]>([]);
  // ── Layanan pertama ──
  const [service, setService] = useState({
    category_id: '', name: '', description: '', price: '',
    unit: 'per_service', estimated_duration: '60', min_order: '1',
    included_items: '', excluded_items: '',
  });
  // Foto produk jasa. Etalase tanpa foto nyaris tidak pernah dilirik pelanggan,
  // jadi minimal 1 wajib . dilampirkan setelah layanan terbuat (butuh id-nya).
  const [servicePhotos, setServicePhotos] = useState<File[]>([]);
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

  // Pratinjau foto layanan: URL objek dibangun sekali per perubahan daftar
  // berkas (useMemo) dan dicabut saat diganti . membangunnya di badan render
  // akan menumpuk blob URL baru pada tiap ketikan di form.
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
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= quota) return prev;
      return [...prev, id];
    });
  };

  const validate = (): string | null => {
    if (needAccount) {
      if (!account.name.trim()) return 'Nama lengkap wajib diisi';
      if (!/^[a-z0-9_]{4,30}$/.test(account.username.trim()))
        return 'Username harus 4-30 karakter: huruf kecil, angka, atau underscore';
      if (!account.phone.trim()) return 'Nomor HP wajib diisi';
      if (account.password.length < 8) return 'Password minimal 8 karakter';
    }
    if (isVendor) {
      if (!vendor.display_name.trim() || !vendor.legal_entity_name.trim() || !vendor.pic_name.trim())
        return 'Badan usaha: nama tampil, nama legal, dan nama PIC wajib diisi';
    }
    if (!region.province || !region.city || !region.district)
      return 'Provinsi, kota, dan kecamatan wajib dipilih';
    if (!basecampTouched) return 'Tandai lokasi basecamp di peta (geser pin ke lokasi kerjamu)';
    if (chosenCats.length === 0) return 'Pilih minimal 1 kategori jasa';
    if (!service.category_id) return 'Pilih kategori untuk layanan pertamamu';
    if (!service.name.trim()) return 'Nama layanan wajib diisi';
    if (!(Number(service.price) > 0)) return 'Harga layanan harus lebih dari 0';
    if (servicePhotos.length === 0) return 'Unggah minimal 1 foto produk jasamu';
    if (!service.included_items.trim() || !service.excluded_items.trim())
      return 'Isi minimal satu baris "harga termasuk" dan "tidak termasuk"';
    if (!agreed) return 'Centang persetujuan S&K terlebih dahulu';
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

      // 2. Pendaftaran + layanan pertama dalam satu panggilan. Tanpa upload
      // KYC/dokumen: paketnya menyusul di /mitra/kyc saat mau tarik dana.
      setStage('submit');
      // partner-terms IKUT disetujui di sini (model instan): mitra bisa
      // menerima order sejak detik pertama, jadi persetujuan kontrak mitranya
      // tidak boleh menunggu modal re-consent di kunjungan berikutnya.
      const legalDocumentIds = (legalDocs || [])
        .filter((d) => d.slug === 'terms' || d.slug === 'privacy' || d.slug === 'partner-terms')
        .map((d) => d.id);

      const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
      const res = await fetchAPI<{ service_created: boolean; service_error?: string; service_id?: string }>(
        '/partners/onboarding/express',
        {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            partner_type: partnerType,
            bio: bio.trim(),
            service_area: [[region.district, region.city].filter(Boolean).join(', ') || 'general'],
            province: region.province,
            city: region.city,
            district: region.district,
            address_detail: addressDetail.trim(),
            basecamp_lat: basecamp.lat,
            basecamp_lon: basecamp.lon,
            legal_document_ids: legalDocumentIds,
            // Bukti alat per kategori menyusul saat KYC (backend mengizinkan
            // evidence kosong pada pendaftaran instan).
            main_categories: chosenCats.map((catId) => ({ category_id: catId, evidence_urls: [] })),
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

      // Token sesi dicetak SEBELUM baris mitra lahir, jadi belum memuat klaim
      // partner_id/role — tanpa refresh, seluruh endpoint mode mitra menolak
      // sampai token kedaluwarsa. switch-role menerbitkan token baru ber-klaim
      // (backend menerima mitra pending saat model instan ON). Best-effort:
      // gagal di sini tidak menggagalkan pendaftaran yang sudah tersimpan.
      try {
        const sw = await fetchAPI<{ user: any; access_token: string }>('/auth/switch-role', {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ target_role: 'partner' }),
        });
        if (sw.success && sw.data?.access_token) login(sw.data.user, sw.data.access_token);
      } catch { /* silent refresh berikutnya memperbaikinya */ }
      // Cache status verifikasi bisa memegang 'NONE' basi (mount /mitra/*
      // sebelum daftar) — tanpa invalidasi, layout melempar mitra baru pulang.
      queryClient.invalidateQueries({ queryKey: ['partner', 'me', 'verification-status'] });

      // 3. Foto layanan menyusul: butuh id layanan yang baru lahir. Kegagalan
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
          <h1 className="mt-4 text-xl font-bold text-brand-gray-900">Selamat, Akun Mitramu Aktif!</h1>
          <p className="mt-2 text-sm leading-relaxed text-brand-gray-700">
            Layananmu <b>langsung tayang dan bisa dipesan sekarang</b>. Jam kerja sementara diset{' '}
            <b>setiap hari 08.00–17.00</b> dan bisa kamu ubah kapan pun dari menu Jadwal. Untuk
            mendapatkan badge <b>Terverifikasi</b> di profilmu dan bisa <b>menarik dana</b>, lengkapi
            verifikasi identitas (KTP + rekening) kapan pun dari menu Verifikasi.
          </p>
          {serviceWarning && (
            <p className="mt-3 rounded-lg border border-brand-warning-border bg-brand-warning-soft p-3 text-xs text-brand-gray-700">
              Layanan pertama belum terbuat ({serviceWarning}). Tambahkan dari menu Layanan setelah masuk.
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => router.push('/mitra/dashboard')}
              className="rounded-md bg-brand-red px-6 py-3 text-sm font-bold text-white hover:bg-brand-red-dark"
            >
              Buka Dasbor Mitra
            </button>
            <button
              onClick={() => router.push('/mitra/kyc')}
              className="rounded-md border border-brand-gray-100 bg-white px-6 py-3 text-sm font-bold text-brand-gray-900 hover:border-brand-red hover:text-brand-red"
            >
              Verifikasi Identitas
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Sakelar instan OFF: form ini pasti ditolak backend ──
  if (instantOff) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-brand-gray-900">Pendaftaran Lewat Formulir Lengkap</h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-gray-700">
          Saat ini pendaftaran mitra memakai formulir lengkap (dengan verifikasi KTP &amp; rekening).
        </p>
        <Link
          href="/mitra/register"
          className="mt-6 inline-block rounded-md bg-brand-red px-6 py-3 text-sm font-bold text-white hover:bg-brand-red-dark"
        >
          Lanjut ke Formulir Pendaftaran
        </Link>
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
      : stage === 'submit' ? 'Mengirim pendaftaran…'
        : stage === 'photos' ? 'Mengunggah foto layanan…' : '';

  // Nomor section berurut. Bagian Akun hanya ada untuk pengunjung yang belum
  // login, jadi nomornya dihitung, bukan diketik tetap.
  let secNo = 0;
  const secNum = {
    account: needAccount ? ++secNo : 0,
    type: ++secNo,
    location: ++secNo,
    category: ++secNo,
    service: ++secNo,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-gray-900">Daftar Jadi Mitra</h1>
        <p className="mt-1 text-sm leading-relaxed text-brand-gray-700">
          Satu formulir singkat . tanpa KTP, tanpa rekening. Begitu terkirim, akunmu{' '}
          <b>langsung aktif dan layananmu bisa dipesan</b>. Verifikasi identitas menyusul saat kamu
          mau menarik dana. Sudah punya akun?{' '}
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
            <h2 className={SECTION_TITLE_CLASS}>
              <User className="h-5 w-5 shrink-0 text-brand-red" />
              {secNum.account}. Info Akun
            </h2>
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
          <h2 className={SECTION_TITLE_CLASS}>
            <Briefcase className="h-5 w-5 shrink-0 text-brand-red" />
            {secNum.type}. Tipe Usaha
          </h2>
          <div className="flex gap-3">
            {(['individual', 'vendor'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setPartnerType(t); setChosenCats([]); setService({ ...service, category_id: '' }); }}
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
              <p className="text-xs text-brand-gray-450">
                Dokumen badan usaha (akta pendirian, NPWP badan, NIB) TIDAK diminta sekarang .
                diunggah nanti bersama verifikasi identitas saat kamu mau menarik dana.
              </p>
            </div>
          )}
        </section>

        {/* ── Lokasi & profil ── */}
        <section className={SECTION_CLASS}>
          <h2 className={SECTION_TITLE_CLASS}>
            <MapPin className="h-5 w-5 shrink-0 text-brand-red" />
            {secNum.location}. Lokasi Jasa & Basecamp
          </h2>
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
            <p className="mt-2 text-xs leading-relaxed text-brand-gray-450">
              Pelanggan di sekitar titik inilah yang akan menemukanmu. Titik pastinya tidak pernah ditampilkan ke publik.
              <br />
              <b className="text-brand-red">Penting:</b> Pastikan pin peta seakurat mungkin. Jika jarak pelanggan melebihi 15 km, kamu akan mendapat tambahan <b>Biaya Transportasi (Rp 3.000 / km berikutnya)</b>.
              Mitra menerima <b>100%</b> dari biaya transportasi ini tanpa dipotong biaya admin platform!
            </p>
          </div>
          <div>
            <label htmlFor="qr-bio" className={LABEL_CLASS}>Tentang kamu / usahamu (opsional)</label>
            <textarea id="qr-bio" className={INPUT_CLASS} rows={3} maxLength={500} value={bio}
              placeholder="Pengalaman, keahlian khusus, garansi…"
              onChange={(e) => setBio(e.target.value)} />
          </div>
        </section>

        {/* ── Kategori ── */}
        <section className={SECTION_CLASS}>
          <h2 className={SECTION_TITLE_CLASS}>
            <GridIcon className="h-5 w-5 shrink-0 text-brand-red" />
            {secNum.category}. Keahlian & Kategori
          </h2>
          <p className="text-xs text-brand-gray-450">
            Pilih {quota === 1 ? 'satu' : `sampai ${quota}`} kategori utama sesuai keahlianmu. Foto
            bukti alat &amp; bahan diminta nanti saat verifikasi identitas . tidak sekarang.
          </p>
          <div className="flex flex-wrap gap-2">
            {(categories ?? []).map((c) => {
              const active = chosenCats.includes(c.id);
              const full = !active && chosenCats.length >= quota;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={full}
                  onClick={() => toggleCat(c.id)}
                  className={`w-fit rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
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
        </section>

        {/* ── Layanan pertama ── */}
        <section className={SECTION_CLASS}>
          <h2 className={SECTION_TITLE_CLASS}>
            <Wrench className="h-5 w-5 shrink-0 text-brand-red" />
            {secNum.service}. Etalase Layanan Pertama
          </h2>
          <p className="text-xs text-brand-gray-450">
            Inilah yang langsung dilihat pelanggan begitu kamu selesai mendaftar. Buatlah semenarik mungkin.
          </p>
          {/* Foto sengaja PALING ATAS: etalase tanpa foto nyaris tidak pernah
              dilirik, jadi jangan sampai jadi isian terakhir yang diskip. */}
          <div>
            <span className={LABEL_CLASS}>Foto Hasil Kerja (Etalase) * (1–{MAX_SERVICE_PHOTOS} foto)</span>
            <PhotoPickerBox
              id="qr-svc-photos"
              items={servicePhotoItems}
              max={MAX_SERVICE_PHOTOS}
              accept="image/jpeg,image/png,image/jpg,image/webp"
              onPick={(picked) => {
                if (!picked) return;
                const files = Array.from(picked).filter((f) => f.size <= MAX_UPLOAD_BYTES);
                setServicePhotos((prev) => [...prev, ...files].slice(0, MAX_SERVICE_PHOTOS));
              }}
              onRemove={(i) => setServicePhotos((prev) => prev.filter((_, idx) => idx !== i))}
            />
            <p className="mt-1 text-xs text-brand-gray-450">
              Foto yang akan dilihat pelanggan pertama kali (misal: AC sebelum/sesudah dicuci, atau hasil akhir yang rapi).
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
              <label htmlFor="qr-svc-unit" className={LABEL_CLASS}>Tarif Dihitung Per *</label>
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
              <label htmlFor="qr-svc-min" className={LABEL_CLASS}>Minimal Pesanan *</label>
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

        {/* ── Legal + submit ── */}
        <LegalConsentCheckbox checked={agreed} onChange={setAgreed} includePartnerTerms />

        <button
          type="button"
          disabled={busy}
          onClick={handleSubmit}
          className="h-12 w-full rounded-md bg-brand-red text-base font-bold text-white transition-colors hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? busyLabel : 'Daftar & Langsung Aktif'}
        </button>
        <p className="text-center text-xs text-brand-gray-450">
          Akunmu aktif seketika setelah mendaftar. Verifikasi identitas (KTP + rekening) diperlukan
          hanya saat kamu ingin menarik dana . profilmu memakai badge &quot;Belum Terverifikasi&quot;
          sampai verifikasimu disetujui.
        </p>
      </div>
    </div>
  );
}
