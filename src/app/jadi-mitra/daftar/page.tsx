'use client';

/**
 * /jadi-mitra/daftar . pendaftaran mitra INSTAN (model mitra instan,
 * PLAN-MITRA-INSTAN 2026-08-14; sebelumnya "satu atap" 2026-08-13).
 *
 * TANPA KYC, TANPA rekening, TANPA dokumen badan usaha, TANPA foto bukti
 * kategori, dan (sejak 2026-08-15, permintaan pemilik) TANPA layanan pertama .
 * form ini murni AKUN + TIPE + LOKASI + KATEGORI:
 *
 *   1. POST /auth/register/quick   . buat akun TANPA OTP, langsung masuk
 *      (dilewati bila pengunjung sudah login)
 *   2. POST /partners/onboarding/express . mitra langsung AKTIF + jam kerja
 *      default + kategori (payload `service` SENGAJA tidak dikirim . backend
 *      memperlakukannya opsional)
 *   3. Redirect ke /mitra/services/new . produk jasa didaftarkan di HALAMAN
 *      ASLI tambah layanan mitra, bukan di form pendaftaran. KYC menyusul via
 *      /mitra/kyc saat mau tarik dana.
 *
 * Profil tampil dengan badge "Belum Terverifikasi" sampai KYC disetujui admin.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MapPin, User, Briefcase, Grid as GridIcon } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import { useAuthStore } from '@/lib/store/authStore';
import { useCategories } from '@/hooks/useCategories';
import { useActiveLegalDocuments } from '@/hooks/useLegalConsent';
import RegionSelect, { type RegionValue } from '@/components/ui/RegionSelect';
import LegalConsentCheckbox from '@/components/auth/LegalConsentCheckbox';
import { INPUT_CLASS, LABEL_CLASS, SECTION_CLASS } from '@/components/ui/form';
import { track } from '@/lib/analytics';

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full animate-pulse items-center justify-center rounded-lg bg-brand-gray-60">
      <MapPin className="h-8 w-8 text-brand-gray-300" />
    </div>
  ),
});


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

/** Kuota kategori utama per tipe . cermin aturan backend (000080): 1 perorangan, 3 vendor. */
const quotaFor = (t: 'individual' | 'vendor') => (t === 'vendor' ? 3 : 1);

type SubmitStage = 'idle' | 'account' | 'submit';

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
  // Layanan pertama TIDAK diisi di sini (keputusan 2026-08-15): produk jasa
  // didaftarkan di halaman asli /mitra/services/new setelah akun aktif.
  const [chosenCats, setChosenCats] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);

  const [stage, setStage] = useState<SubmitStage>('idle');
  const [error, setError] = useState<string | null>(null);

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

      // 2. Pendaftaran mitra. Tanpa upload KYC/dokumen (menyusul di /mitra/kyc)
      // dan TANPA layanan pertama . field `service` sengaja tidak dikirim,
      // backend memperlakukannya opsional; produk jasa didaftarkan setelah ini
      // di /mitra/services/new.
      setStage('submit');
      // partner-terms IKUT disetujui di sini (model instan): mitra bisa
      // menerima order sejak detik pertama, jadi persetujuan kontrak mitranya
      // tidak boleh menunggu modal re-consent di kunjungan berikutnya.
      const legalDocumentIds = (legalDocs || [])
        .filter((d) => d.slug === 'terms' || d.slug === 'privacy' || d.slug === 'partner-terms')
        .map((d) => d.id);

      const res = await fetchAPI(
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
          }),
        },
      );
      if (!res.success) throw new Error(getErrorMessage(res));

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

      track('partner_quick_register_submitted');
      // 3. Langsung ke halaman ASLI tambah layanan (keputusan 2026-08-15):
      // etalase kosong belum bisa dipesan siapa pun, jadi langkah wajar
      // berikutnya adalah mendaftarkan produk jasa . di halaman yang memang
      // dibuat untuk itu, bukan di form pendaftaran. `replace`, bukan `push`:
      // tombol back tidak boleh kembali ke form berisi data yang sudah terpakai.
      router.replace('/mitra/services/new');
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan. Coba lagi.');
      setStage('idle');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
      : stage === 'submit' ? 'Mengaktifkan akun mitramu…' : '';

  // Nomor section berurut. Bagian Akun hanya ada untuk pengunjung yang belum
  // login, jadi nomornya dihitung, bukan diketik tetap.
  let secNo = 0;
  const secNum = {
    account: needAccount ? ++secNo : 0,
    type: ++secNo,
    location: ++secNo,
    category: ++secNo,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-gray-900">Daftar Jadi Mitra</h1>
        <p className="mt-1 text-sm leading-relaxed text-brand-gray-700">
          Satu formulir singkat . tanpa KTP, tanpa rekening. Begitu terkirim, akunmu{' '}
          <b>langsung aktif</b> dan kamu diarahkan untuk <b>mendaftarkan produk jasamu</b> supaya
          bisa dipesan pelanggan. Sudah punya akun?{' '}
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
                onClick={() => { setPartnerType(t); setChosenCats([]); }}
                className={`flex-1 rounded-md border p-3 text-sm font-semibold transition-colors ${partnerType === t
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
                  className={`w-fit rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${active
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
