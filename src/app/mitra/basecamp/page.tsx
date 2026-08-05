"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/ui/skeleton';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useIsPartnerVerified } from '@/hooks/usePartnerVerificationStatus';
import { VerifiedLockNotice } from '@/components/mitra/VerifiedLockBadge';
import RegionSelect from '@/components/ui/RegionSelect';
import dynamic from 'next/dynamic';
import { getErrorMessage } from '@/types/api';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false, loading: () => <div className="h-64 bg-brand-gray-100 flex items-center justify-center rounded-lg animate-pulse"><MapPin className="w-8 h-8 text-brand-gray-100" /></div> });

export default function MitraBasecampPage() {
  const { isAuthorized, isLoading: authLoading } = useRequireAuth();
  const isVerified = useIsPartnerVerified(isAuthorized);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [basecamp, setBasecamp] = useState({ lat: -6.2088, lon: 106.8456 });
  const [provinsi, setProvinsi] = useState('');
  const [kota, setKota] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [detail, setDetail] = useState('');
  // Preserve bio (dikirim ulang agar tidak tertimpa). Field bank TIDAK dikirim:
  // backend memakai COALESCE sehingga nilai lama dipertahankan bila field kosong.
  const [bio, setBio] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const profileRes = await fetchAPI<any>('/partners/me');
      if (profileRes.success && profileRes.data) {
        const d = profileRes.data;
        if (d.basecamp_lat && d.basecamp_lon) setBasecamp({ lat: d.basecamp_lat, lon: d.basecamp_lon });
        setBio(d.bio || '');
        setDetail(d.address_detail || '');
        // Kolom province/city/district (setelah backend deploy) ATAU fallback parse service_area "Kecamatan, Kota".
        if (d.city || d.district) {
          setProvinsi(d.province || '');
          setKota(d.city || '');
          setKecamatan(d.district || '');
        } else if (d.service_area && d.service_area !== 'general') {
          const parts = String(d.service_area).split(',').map((s: string) => s.trim());
          setKecamatan(parts[0] || '');
          setKota(parts[1] || '');
        }
      } else {
        setError(getErrorMessage(profileRes));
      }
    } catch (e) {
      setError('Gagal mengambil profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!provinsi || !kota || !kecamatan) {
      setError('Provinsi, Kota, dan Kecamatan wajib diisi');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Mitra approved: jangan kirim field terkunci (basecamp_lat/lon, service_area).
      // Guard F1 backend membandingkan nilai kiriman vs tersimpan, bukan "apakah
      // user mengetik" — service_area direkonstruksi dan basecamp punya default
      // Jakarta, keduanya bisa memicu false-positive `DATA_VERIFIED_LOCKED`.
      // Backend cabang approved sudah menulis ulang nilai lama, jadi aman dipangkas.
      const body: Record<string, unknown> = {
        bio,
        province: provinsi,
        city: kota,
        district: kecamatan,
        address_detail: detail,
      };
      if (!isVerified) {
        const areaLabel = [kecamatan, kota].filter(Boolean).join(', ');
        // service_area tetap dikirim agar profil tampil benar sebelum kolom baru dideploy.
        body.service_area = areaLabel ? [areaLabel] : undefined;
        body.basecamp_lat = basecamp.lat;
        body.basecamp_lon = basecamp.lon;
      }
      const res = await fetchAPI('/partners/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (res.success) {
        router.back();
      } else {
        setError(getErrorMessage(res));
      }
    } catch (e) {
      setError('Terjadi kesalahan sistem');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  const inputCls = "w-full p-3 border border-brand-gray-100 rounded-md text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red";

  return (
    <div className="page-h bg-brand-gray-60 pb-24">
      <MitraPageHeader
        title="Alamat Basecamp"
        variant="form"
        backHref="/mitra/profile"
        breadcrumbs={[{ label: 'Profil', href: '/mitra/profile' }, { label: 'Alamat Basecamp' }]}
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {isVerified && (
          <VerifiedLockNotice
            title="Koordinat & wilayah terkunci"
            message="Titik lokasi & wilayah layanan sudah diverifikasi admin. Detail alamat & deskripsi tetap bisa diubah. Hubungi admin untuk mengubah koordinat (cabut verifikasi)."
          />
        )}
        <div className="bg-brand-error-soft border border-brand-error-border rounded-lg p-3 flex gap-3">
          <AlertCircle className="w-5 h-5 text-brand-error shrink-0" />
          <p className="text-xs text-brand-error-dark leading-relaxed">
            Perubahan basecamp hanya memengaruhi perhitungan jarak & biaya transport pada pesanan <strong>BARU</strong>.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-brand-gray-100 p-4 space-y-4">
          <div>
            <h3 className="font-bold text-brand-gray-900 mb-1">Titik Lokasi Basecamp</h3>
            <p className="text-xs text-brand-gray-400 mb-3">Ketuk/geser pin, atau tekan tombol “Lokasi saya” untuk memakai GPS.</p>
            <div
              className={`h-64 rounded-lg overflow-hidden border border-brand-gray-100 ${
                isVerified ? 'pointer-events-none opacity-60' : ''
              }`}
              aria-disabled={isVerified || undefined}
            >
              <MapPicker lat={basecamp.lat} lng={basecamp.lon} onChange={(lat, lng) => setBasecamp({ lat, lon: lng })} />
            </div>
          </div>

          <RegionSelect
            value={{ province: provinsi, city: kota, district: kecamatan }}
            onChange={(v) => { setProvinsi(v.province); setKota(v.city); setKecamatan(v.district); }}
            selectClassName={inputCls + ' bg-white'}
            disabled={isVerified}
          />
          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Deskripsi Diri</label>
            <textarea
              className={inputCls}
              placeholder="Ceritakan pengalaman & keahlianmu (min. 20 karakter untuk skor kelengkapan)"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-brand-gray-400 mt-1">
              Deskripsi hanya bisa diganti, belum bisa dikosongkan.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Detail Alamat (opsional)</label>
            <input className={inputCls} placeholder="Nama jalan, patokan, dsb." value={detail} onChange={(e) => setDetail(e.target.value)} />
          </div>

          {error && <div className="text-sm text-brand-error">{error}</div>}

          <Button className="w-full bg-brand-red hover:bg-brand-red-dark text-white py-6" onClick={handleSave} disabled={submitting}>
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan Basecamp'}
          </Button>
        </div>
      </div>
    </div>
  );
}
