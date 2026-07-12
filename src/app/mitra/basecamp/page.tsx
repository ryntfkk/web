"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import dynamic from 'next/dynamic';
import { getErrorMessage } from '@/types/api';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false, loading: () => <div className="h-64 bg-gray-100 flex items-center justify-center rounded-lg animate-pulse"><MapPin className="w-8 h-8 text-gray-300" /></div> });

export default function MitraBasecampPage() {
  const { isAuthorized, isLoading: authLoading } = useRequireAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [basecamp, setBasecamp] = useState({
    lat: -6.2088,
    lon: 106.8456
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetchAPI<any>('/partners/me');
      if (res.success && res.data) {
        if (res.data.basecamp_lat && res.data.basecamp_lon) {
          setBasecamp({
            lat: res.data.basecamp_lat,
            lon: res.data.basecamp_lon
          });
        }
      } else {
        setError(getErrorMessage(res));
      }
    } catch (e) {
      setError('Gagal mengambil profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchAPI('/partners/me', {
        method: 'PATCH',
        body: JSON.stringify({
          basecamp_lat: basecamp.lat,
          basecamp_lon: basecamp.lon
        })
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

  if (authLoading || loading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <h1 className="text-base font-bold text-[#1c1b1b]">Alamat Basecamp</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="bg-[#FFF5F5] border border-[#FEB2B2] rounded-lg p-3 flex gap-3">
          <AlertCircle className="w-5 h-5 text-[#E53E3E] shrink-0" />
          <p className="text-xs text-[#C53030] leading-relaxed">
            Perhatian: Perubahan alamat basecamp hanya akan memengaruhi perhitungan jarak dan biaya transport pada pesanan <strong>BARU</strong>. Pesanan yang sudah ada tetap menggunakan basecamp lama.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#e5e2e1] p-4">
          <h3 className="font-bold text-[#1c1b1b] mb-4">Tentukan Lokasi Basecamp</h3>
          {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
          <div className="mb-4">
            <MapPicker 
              lat={basecamp.lat} 
              lng={basecamp.lon} 
              onChange={(lat, lng) => setBasecamp({ lat, lon: lng })} 
            />
          </div>
          
          <Button 
            className="w-full bg-[#b51822] hover:bg-[#96121a] text-white py-6"
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan Basecamp'}
          </Button>
        </div>
      </div>
    </div>
  );
}
