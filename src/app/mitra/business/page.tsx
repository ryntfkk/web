'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';

import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import MitraSection from '@/components/mitra/MitraSection';
import { VerifiedLockNotice } from '@/components/mitra/VerifiedLockBadge';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { fetchAPI } from '@/lib/api';
import { track } from '@/lib/analytics';
import { getErrorMessage } from '@/types/api';

/**
 * Identitas badan usaha (vendor).
 *
 * Sebelum halaman ini ada, vendor TIDAK PUNYA cara mengubah . bahkan melihat .
 * data usahanya setelah disetujui: `PATCH /partners/me` hanya menerima
 * bio/lokasi, dan `PUT /partners/me/resubmission` menolak siapa pun yang
 * statusnya bukan `rejected`. Ganti nomor kantor berarti menghubungi admin.
 *
 * Pembagiannya mengikuti aturan backend (DEVELOPER_NOTES §7o) dan tidak boleh
 * digeser dari sini saja . query `UpdatePartnerVendorContact` yang menentukan:
 *
 *  - BISA diubah sendiri: nama tampil, jabatan PIC, telepon & email bisnis.
 *  - TERKUNCI admin: nama badan hukum, bentuk badan usaha, NPWP, NIB, nama PIC.
 *    Kelimanya terikat akta dan NPWP yang sudah ditinjau; mengubahnya berarti
 *    uang berpindah ke badan hukum lain, jadi wajib lewat admin dengan alasan
 *    tertulis (PATCH /admin/partners/:id/identity).
 */
interface PartnerBusiness {
  partner_type?: string;
  name?: string;
  legal_name?: string;
  entity_form?: string;
  pic_name?: string;
  pic_position?: string;
  business_phone?: string;
  business_email?: string;
  nib?: string;
  npwp_masked?: string;
}

/** Field yang boleh disunting sendiri . cerminan UpdateProfileRequest. */
interface EditableForm {
  display_name: string;
  pic_position: string;
  business_phone: string;
  business_email: string;
}

const EMPTY_FORM: EditableForm = {
  display_name: '',
  pic_position: '',
  business_phone: '',
  business_email: '',
};

export default function MitraBusinessPage() {
  const { isLoading: authLoading, isAuthorized, isAuthenticated } = useRequireAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [data, setData] = useState<PartnerBusiness | null>(null);
  const [form, setForm] = useState<EditableForm>(EMPTY_FORM);
  const [initial, setInitial] = useState<EditableForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchAPI<PartnerBusiness>('/partners/me');
    if (res.success && res.data) {
      const d = res.data;
      setData(d);
      const next: EditableForm = {
        display_name: d.name || '',
        pic_position: d.pic_position || '',
        business_phone: d.business_phone || '',
        business_email: d.business_email || '',
      };
      setForm(next);
      setInitial(next);
    } else {
      setError(getErrorMessage(res));
    }
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAuthenticated) return;
    load();
  }, [isAuthenticated, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isVendor = data?.partner_type === 'vendor';

  // Hanya kirim yang BERUBAH. Backend membedakan null ("jangan sentuh") dari
  // string kosong ("kosongkan"), jadi mengirim seluruh form akan menulis ulang
  // nama tampil pada tiap simpan . dan setiap tulisan itu tercatat di audit log
  // sebagai penggantian nama yang tidak pernah terjadi.
  const changed = (): Partial<EditableForm> => {
    const diff: Partial<EditableForm> = {};
    (Object.keys(form) as (keyof EditableForm)[]).forEach((k) => {
      if (form[k].trim() !== initial[k].trim()) diff[k] = form[k].trim();
    });
    return diff;
  };

  const hasChanges = Object.keys(changed()).length > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = changed();
    if (Object.keys(payload).length === 0) return;

    if (payload.display_name !== undefined && payload.display_name.length < 3) {
      setError('Nama tampil minimal 3 karakter.');
      return;
    }

    setSaving(true);
    const res = await fetchAPI('/partners/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (res.success) {
      showToast('Identitas usaha berhasil diperbarui');
      if (payload.display_name !== undefined) track('partner_display_name_updated');
      setInitial(form);
      load();
    } else {
      setError(getErrorMessage(res));
    }
  };

  if (authLoading || loading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  // Perorangan tidak punya identitas badan usaha sama sekali. Diarahkan, bukan
  // dibiarkan melihat form kosong yang setiap simpannya akan ditolak
  // VENDOR_ONLY_FIELD oleh backend.
  if (data && !isVendor) {
    return (
      <div>
        <MitraPageHeader
          title="Identitas Usaha"
          backHref="/mitra/profile"
          variant="profile"
          breadcrumbs={[{ label: 'Profil', href: '/mitra/profile' }, { label: 'Identitas Usaha' }]}
        />
        <MitraPageContainer variant="profile">
          <div className="rounded-lg border border-brand-gray-100 bg-white p-6 text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-brand-gray-400" aria-hidden />
            <p className="text-sm font-semibold text-brand-gray-900">
              Akunmu terdaftar sebagai mitra perorangan
            </p>
            <p className="mt-1 text-xs text-brand-gray-450">
              Halaman ini hanya untuk mitra badan usaha. Nama, nomor HP, dan emailmu diatur di
              Informasi Akun.
            </p>
            <Button
              variant="outline"
              className="mt-4 border-brand-red text-brand-red hover:bg-brand-error-soft"
              onClick={() => router.push('/mitra/account')}
            >
              Buka Informasi Akun
            </Button>
          </div>
        </MitraPageContainer>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <MitraPageHeader
        title="Identitas Usaha"
        subtitle="Nama tampil, PIC & kontak bisnis"
        backHref="/mitra/profile"
        variant="profile"
        breadcrumbs={[{ label: 'Profil', href: '/mitra/profile' }, { label: 'Identitas Usaha' }]}
      />

      <MitraPageContainer variant="profile" className="space-y-5">
        <form onSubmit={handleSave}>
          <MitraSection
            title="Bisa kamu ubah sendiri"
            description="Nama tampil adalah nama yang dilihat pelanggan di hasil pencarian dan halaman profilmu."
            card
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="display_name" className="mb-1 block text-sm font-semibold text-brand-gray-900">
                  Nama Tampil
                </label>
                <input
                  id="display_name"
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  maxLength={255}
                  className="w-full rounded border border-brand-gray-100 p-3 text-sm text-brand-gray-900 focus:border-brand-red focus:outline-none"
                />
                <p className="mt-1 text-xs text-brand-gray-450">
                  Harus unik antar mitra. Mengubahnya mengubah nama di seluruh etalase dan pesanan
                  barumu.
                </p>
              </div>

              <div>
                <label htmlFor="pic_position" className="mb-1 block text-sm font-semibold text-brand-gray-900">
                  Jabatan PIC
                </label>
                <input
                  id="pic_position"
                  type="text"
                  value={form.pic_position}
                  onChange={(e) => setForm({ ...form, pic_position: e.target.value })}
                  maxLength={100}
                  placeholder="Contoh: Direktur Operasional"
                  className="w-full rounded border border-brand-gray-100 p-3 text-sm text-brand-gray-900 focus:border-brand-red focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="business_phone" className="mb-1 block text-sm font-semibold text-brand-gray-900">
                  Telepon Bisnis
                </label>
                <input
                  id="business_phone"
                  type="tel"
                  inputMode="tel"
                  value={form.business_phone}
                  onChange={(e) => setForm({ ...form, business_phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded border border-brand-gray-100 p-3 text-sm text-brand-gray-900 focus:border-brand-red focus:outline-none"
                />
                <p className="mt-1 text-xs text-brand-gray-450">
                  Nomor kantor. Berbeda dari nomor HP pribadimu, yang dipakai login dan OTP.
                  Kosongkan bila tidak ada.
                </p>
              </div>

              <div>
                <label htmlFor="business_email" className="mb-1 block text-sm font-semibold text-brand-gray-900">
                  Email Bisnis
                </label>
                <input
                  id="business_email"
                  type="email"
                  value={form.business_email}
                  onChange={(e) => setForm({ ...form, business_email: e.target.value })}
                  placeholder="Opsional"
                  className="w-full rounded border border-brand-gray-100 p-3 text-sm text-brand-gray-900 focus:border-brand-red focus:outline-none"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-brand-error-border bg-brand-error-soft p-3 text-sm text-brand-error"
                >
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={!hasChanges || saving}
                  onClick={() => {
                    setForm(initial);
                    setError('');
                  }}
                >
                  Batalkan
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-brand-red hover:bg-brand-red-dark"
                  disabled={!hasChanges || saving}
                >
                  {saving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
                    </span>
                  ) : (
                    'Simpan'
                  )}
                </Button>
              </div>
            </div>
          </MitraSection>
        </form>

        <MitraSection
          title="Terkunci . hanya bisa diubah admin"
          description="Data ini terikat akta dan NPWP yang sudah ditinjau. Mengubahnya berarti uang berpindah ke badan hukum lain."
          card
        >
          <dl className="divide-y divide-brand-gray-100">
            {[
              { label: 'Nama Badan Hukum', value: data?.legal_name },
              { label: 'Bentuk Badan Usaha', value: data?.entity_form },
              { label: 'Nama PIC', value: data?.pic_name },
              { label: 'NPWP', value: data?.npwp_masked ? 'Tersimpan' : '' },
              { label: 'NIB', value: data?.nib },
            ].map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 py-3">
                <dt className="text-sm text-brand-gray-700">{row.label}</dt>
                <dd className="text-right text-sm font-medium text-brand-gray-900">
                  {row.value || <span className="text-brand-gray-400">Belum diisi</span>}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3">
            <VerifiedLockNotice
              title="Perlu bantuan admin"
              message="Hubungi CS lewat Bantuan Mitra bila data badan hukum di atas perlu dikoreksi. Sertakan dokumen pendukungnya."
            />
          </div>
        </MitraSection>
      </MitraPageContainer>
    </div>
  );
}
