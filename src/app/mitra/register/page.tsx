"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Upload, CheckCircle } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { PageSkeleton } from '@/components/ui/skeleton';
import RegionSelect from '@/components/ui/RegionSelect';
import PhoneVerificationModal from '@/components/ui/PhoneVerificationModal';
import { useAuthStore } from '@/lib/store/authStore';
import LegalConsentCheckbox from '@/components/auth/LegalConsentCheckbox';
import { useActiveLegalDocuments, recordLegalConsent } from '@/hooks/useLegalConsent';
import { usePlatformConfig, formatFeeRate } from '@/hooks/usePlatformConfig';
import { formatPrice } from '@/lib/format';
import dynamic from 'next/dynamic';
// Leaflet CSS kini di-import global di app/globals.css (lihat catatan di sana).

// Dynamically import Map component to avoid SSR issues with Leaflet
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

function MitraRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReverify = searchParams?.get('mode') === 'reverify';
  const [step, setStep] = useState(1);
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
    bank_account_name: ''
  });

  const nextStep = () => setStep((s) => Math.min(s + 1, 5));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  useEffect(() => {
    if (isReverify) {
      fetchAPI<any>('/partners/me').then(res => {
        if (res.success && res.data) {
          setFormData(prev => ({
            ...prev,
            ktp_number: res.data.ktp_number || '',
            bio: res.data.bio || '',
            basecamp_lat: res.data.basecamp_lat || prev.basecamp_lat,
            basecamp_lon: res.data.basecamp_lon || prev.basecamp_lon,
            bank_code: res.data.bank_code || '',
            bank_account_number: res.data.bank_account_number || '',
            bank_account_name: res.data.bank_account_name || ''
          }));
        }
      });
    }
  }, [isReverify]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, [field]: e.target.files[0] });
    }
  };

  const uploadFileToS3 = async (file: File) => {
    // 1. Get presigned URL
    const { success, data } = await fetchAPI<{ upload_url: string, file_url: string }>('/partners/upload/presigned-url', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, content_type: file.type }),
      credentials: 'include'
    });

    if (!success || !data) throw new Error('Failed to get presigned URL');

    // 2. Upload to S3
    const uploadRes = await fetch(data.upload_url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    });

    if (!uploadRes.ok) throw new Error('Failed to upload file');

    // 3. Return final URL
    return data.file_url;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!formData.ktp_photo || !formData.selfie_ktp) throw new Error('Mohon lengkapi foto KTP dan Selfie');
      
      // Upload files
      const ktpUrl = await uploadFileToS3(formData.ktp_photo);
      const selfieUrl = await uploadFileToS3(formData.selfie_ktp);

      // Submit Form
      const res = await fetchAPI('/partners/onboarding', {
        method: 'POST',
        body: JSON.stringify({
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
          bank_account_name: formData.bank_account_name
        }),
        credentials: 'include'
      });

      if (!res.success) throw new Error(typeof res.error === 'string' ? res.error : 'Gagal mengirim form');

      // Persetujuan dicatat pada momen mitra menyerahkan pengajuan — inilah
      // titik ia menyetujui skema komisi. Reverify tidak dilewati: teksnya
      // ditampilkan lagi dan versi yang berlaku bisa saja sudah berubah.
      if (legalDocs?.length) {
        await recordLegalConsent(legalDocs, ['terms', 'privacy']);
      }

      router.push('/mitra/verification-status');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-h bg-brand-gray-60 flex flex-col">
      <div className="bg-white px-4 py-3 flex items-center border-b border-brand-gray-100 sticky top-0 z-10 shadow-sm">
        <button onClick={() => step > 1 ? prevStep() : router.back()} className="p-2 -ml-2 text-brand-gray-400" aria-label="Sebelumnya">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-brand-gray-800 font-bold text-lg flex-1 text-center pr-8">{isReverify ? 'Verifikasi Ulang' : 'Pendaftaran Mitra'}</h1>
      </div>

      <div className="flex-1 p-4 max-w-md w-full mx-auto">
        {needsPhone && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-brand-gray-900">
              Verifikasi nomor HP dulu
            </p>
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

        <PhoneVerificationModal
          isOpen={showPhoneModal}
          onClose={() => setShowPhoneModal(false)}
          onSuccess={() => setShowPhoneModal(false)}
        />

        <div className="flex justify-between items-center mb-6 px-2 relative">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-brand-gray-100 -z-10"></div>
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? 'bg-brand-red text-white' : 'bg-white text-brand-gray-200 border border-brand-gray-200'}`}>
              {step > s ? <CheckCircle className="w-4 h-4" /> : s}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-brand-red text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-gray-100">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-brand-gray-800">Identitas Dasar</h2>
              <div>
                <label className="text-sm font-medium text-brand-gray-700 block mb-1">Nomor KTP (NIK)</label>
                <input type="text" inputMode="numeric" maxLength={16} className="w-full bg-brand-gray-60 border border-brand-gray-200 rounded-xl px-4 py-3 text-brand-gray-800 focus:outline-none focus:border-brand-red" placeholder="16 Digit NIK" value={formData.ktp_number} onChange={(e) => setFormData({...formData, ktp_number: e.target.value.replace(/\D/g, '')})} />
              </div>
              <Button className="w-full mt-4" onClick={nextStep} disabled={formData.ktp_number.length < 16}>Selanjutnya</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-brand-gray-800">Dokumen Pribadi</h2>
              <div>
                <label className="text-sm font-medium text-brand-gray-700 block mb-1">Foto KTP</label>
                <div className="border-2 border-dashed border-brand-gray-200 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => document.getElementById('ktp_photo')?.click()}>
                  <Upload className="w-6 h-6 text-brand-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-brand-gray-400">{formData.ktp_photo ? formData.ktp_photo.name : 'Pilih Foto KTP'}</span>
                  <input id="ktp_photo" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'ktp_photo')} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-gray-700 block mb-1">Selfie dengan KTP</label>
                <div className="border-2 border-dashed border-brand-gray-200 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => document.getElementById('selfie_ktp')?.click()}>
                  <Upload className="w-6 h-6 text-brand-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-brand-gray-400">{formData.selfie_ktp ? formData.selfie_ktp.name : 'Pilih Foto Selfie KTP'}</span>
                  <input id="selfie_ktp" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'selfie_ktp')} />
                </div>
              </div>
              <Button className="w-full mt-4" onClick={nextStep} disabled={!formData.ktp_photo || !formData.selfie_ktp}>Selanjutnya</Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-brand-gray-800">Profil Profesional</h2>
              <div>
                <label className="text-sm font-medium text-brand-gray-700 block mb-1">Deskripsi / Pengalaman</label>
                <textarea className="w-full bg-brand-gray-60 border border-brand-gray-200 rounded-xl px-4 py-3 text-brand-gray-800 focus:outline-none focus:border-brand-red h-24 resize-none" placeholder="Ceritakan pengalaman dan keahlian Anda..." value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} />
              </div>
              <Button className="w-full mt-4" onClick={nextStep} disabled={!formData.bio}>Selanjutnya</Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in fade-in h-[60vh] flex flex-col">
              <h2 className="text-xl font-bold text-brand-gray-800">Lokasi Basecamp</h2>
              <p className="text-sm text-brand-gray-400">Tentukan lokasi tempat Anda bekerja (basecamp) di peta. Jarak pesanan dihitung dari lokasi ini.</p>
              
              <div className="min-h-[240px] border border-brand-gray-200 rounded-xl overflow-hidden relative">
                 <MapPicker
                    lat={formData.basecamp_lat}
                    lng={formData.basecamp_lon}
                    onChange={(lat, lng) => setFormData({...formData, basecamp_lat: lat, basecamp_lon: lng})}
                 />
              </div>

              <RegionSelect
                value={{ province: formData.province, city: formData.city, district: formData.district }}
                onChange={(v) => setFormData({ ...formData, ...v })}
                selectClassName="w-full bg-brand-gray-60 border border-brand-gray-200 rounded-xl px-4 py-3 text-brand-gray-800 focus:outline-none focus:border-brand-red"
                labelClassName="text-sm font-medium text-brand-gray-700 block mb-1"
              />
              <div>
                <label className="text-sm font-medium text-brand-gray-700 block mb-1">Detail Alamat (opsional)</label>
                <input className="w-full bg-brand-gray-60 border border-brand-gray-200 rounded-xl px-4 py-3 text-brand-gray-800 focus:outline-none focus:border-brand-red" placeholder="Nama jalan, patokan, dsb." value={formData.address_detail} onChange={(e) => setFormData({ ...formData, address_detail: e.target.value })} />
              </div>

              <Button
                className="w-full"
                onClick={() => nextStep()}
                disabled={!formData.province || !formData.city || !formData.district}
              >Selanjutnya</Button>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-brand-gray-800">Rekening Pencairan</h2>
              <div>
                <label className="text-sm font-medium text-brand-gray-700 block mb-1">Kode Bank</label>
                <select className="w-full bg-brand-gray-60 border border-brand-gray-200 rounded-xl px-4 py-3 text-brand-gray-800 focus:outline-none focus:border-brand-red" value={formData.bank_code} onChange={(e) => setFormData({...formData, bank_code: e.target.value})}>
                  <option value="">Pilih Bank</option>
                  <option value="BCA">BCA</option>
                  <option value="MANDIRI">Bank Mandiri</option>
                  <option value="BNI">BNI</option>
                  <option value="BRI">BRI</option>
                  <option value="BSI">BSI</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-gray-700 block mb-1">Nomor Rekening</label>
                <input type="text" inputMode="numeric" className="w-full bg-brand-gray-60 border border-brand-gray-200 rounded-xl px-4 py-3 text-brand-gray-800 focus:outline-none focus:border-brand-red" placeholder="Contoh: 1234567890" value={formData.bank_account_number} onChange={(e) => setFormData({...formData, bank_account_number: e.target.value.replace(/\D/g, '')})} />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-gray-700 block mb-1">Nama Pemilik Rekening</label>
                <input type="text" className="w-full bg-brand-gray-60 border border-brand-gray-200 rounded-xl px-4 py-3 text-brand-gray-800 focus:outline-none focus:border-brand-red uppercase" placeholder="SESUAI BUKU TABUNGAN" value={formData.bank_account_name} onChange={(e) => setFormData({...formData, bank_account_name: e.target.value.toUpperCase()})} />
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
                    <span className="font-semibold text-brand-gray-900">{formatFeeRate(platformConfig.platform_fee_rate)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-brand-gray-700">
                    <span>Penarikan saldo</span>
                    <span className="font-semibold text-brand-gray-900">
                      min {formatPrice(platformConfig.min_transaction)} · biaya {formatPrice(platformConfig.withdrawal_fee)}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-brand-gray-450 pt-1">
                    Tarif dapat berubah sewaktu-waktu; perubahan diumumkan di platform.
                    Pembayaran di luar platform dilarang.
                  </p>
                </div>
              </LegalConsentCheckbox>

              <Button className="w-full mt-4" onClick={handleSubmit} disabled={loading || !agreed || !formData.bank_code || !formData.bank_account_number || !formData.bank_account_name.trim()}>
                {loading ? 'Mengirim Data...' : isReverify ? 'Perbaiki & Kirim Ulang' : 'Kirim Pendaftaran'}
              </Button>
            </div>
          )}
        </div>
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

