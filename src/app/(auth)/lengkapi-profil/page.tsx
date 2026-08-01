'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { safeRedirect } from '@/lib/utils';
import PhoneVerificationForm from '@/components/auth/PhoneVerificationForm';

/**
 * Interstitial setelah masuk dengan Google.
 *
 * Akun Google lahir tanpa nomor HP, sementara pemesanan, pendaftaran mitra, dan
 * penarikan dana semuanya menuntut nomor terverifikasi. Sebelum halaman ini,
 * satu-satunya tempat syarat itu muncul adalah tombol "Buat Pesanan" di ujung
 * alur booking — setelah alamat, jadwal, foto, dan promo terlanjur diisi.
 *
 * SENGAJA bukan gerbang keras: menjelajah dan melihat jasa tetap terbuka, dan
 * "Nanti saja" mengantar ke tujuan semula.
 */
function LengkapiProfilContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isInitializing } = useAuthStore();

  const next = safeRedirect(searchParams.get('next') ?? '/');

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent('/lengkapi-profil')}`);
      return;
    }
    // Sudah lengkap (mis. dibuka lagi lewat riwayat browser) — jangan tahan user.
    if (user?.profile_complete) {
      router.replace(next);
    }
  }, [isAuthenticated, isInitializing, user?.profile_complete, next, router]);

  if (isInitializing || !isAuthenticated || user?.profile_complete) {
    return (
      <div className="page-h bg-brand-gray-60 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
      </div>
    );
  }

  return (
    <div className="page-h bg-brand-gray-60 flex flex-col sm:justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-brand-gray-900">
          Lengkapi Profil
        </h2>
        <p className="mt-2 text-center text-sm text-brand-gray-700">
          Satu langkah lagi, {user?.name?.split(' ')[0] || 'Kak'}. Verifikasi nomor WhatsApp kamu
          supaya bisa mulai memesan.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white rounded-2xl border border-brand-gray-100 p-6">
          <PhoneVerificationForm
            onSuccess={() => router.replace(next)}
            secondaryAction={{ label: 'Nanti saja', onClick: () => router.replace(next) }}
          />
        </div>
      </div>
    </div>
  );
}

export default function LengkapiProfilPage() {
  return (
    <Suspense
      fallback={
        <div className="page-h bg-brand-gray-60 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
        </div>
      }
    >
      <LengkapiProfilContent />
    </Suspense>
  );
}
