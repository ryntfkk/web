'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { safeRedirect } from '@/lib/utils';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

function LoginContent() {
  const { login, loginWithGoogle, loading, error, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Param mentah (bisa null). JANGAN di-`safeRedirect` di sini: safeRedirect(null)
  // mengembalikan '/', sehingga selalu truthy dan mematikan default berbasis
  // peran di useAuth (mitra tak pernah ke /mitra/dashboard). Sanitasi dilakukan
  // saat dipakai.
  const rawRedirect = searchParams.get('redirect');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Sudah login saat membuka /login: honor redirect eksplisit, selain itu arahkan
  // sesuai peran (konsisten dgn useAuth.login).
  useEffect(() => {
    if (isAuthenticated) {
      if (rawRedirect) {
        router.replace(safeRedirect(rawRedirect));
      } else if (user?.active_role === 'partner') {
        router.replace('/mitra/dashboard');
      } else {
        router.replace('/');
      }
    }
  }, [isAuthenticated, user, router, rawRedirect]);

  // Don't render login form if authenticated
  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Kirim param mentah (null→undefined) agar useAuth menerapkan default peran.
    await login(identifier, password, rememberMe, rawRedirect ?? undefined);
  };

  return (
    // Mobile: rata atas dengan padding ringkas agar form langsung terlihat tanpa scroll.
    // Desktop (sm+): tetap terpusat vertikal; 4rem = tinggi TopNavbar (h-16).
    <div className="min-h-[calc(100dvh-4rem)] bg-brand-gray-60 flex flex-col justify-start pt-5 pb-8 px-4 sm:justify-center sm:px-6 sm:py-12 lg:px-8">
      {/* Back button khusus mobile . di mobile TopNavbar disembunyikan di halaman login. */}
      <Link
        href="/"
        aria-label="Kembali ke beranda"
        className="lg:hidden absolute top-4 left-4 p-2 -ml-1 rounded hover:bg-black/5 text-brand-gray-700"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <div className="mx-auto w-full max-w-md">
        {/* Brand Logo */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="POSKO JASA" width={32} height={32} className="w-8 h-8 object-contain" priority />
            <span className="text-[22px] font-bold text-brand-gray-900 tracking-[-0.5px]">POSKO</span>
          </div>
        </div>
        <h2 className="text-center text-xl sm:text-3xl font-extrabold text-brand-gray-900">
          Masuk ke akun Anda
        </h2>
        <p className="mt-1 sm:mt-2 text-center text-sm text-brand-gray-700">
          Atau{' '}
          {/* Tujuan redirect ikut dibawa ke pendaftaran. Tanpa ini, pengunjung
              yang datang dari CTA "jadi mitra" kehilangan tujuannya begitu ia
              sadar belum punya akun . ia mendaftar, lalu mendarat di beranda
              tanpa petunjuk apa pun tentang niat awalnya. */}
          <Link
            href={rawRedirect ? `/register?redirect=${encodeURIComponent(safeRedirect(rawRedirect))}` : '/register'}
            className="font-medium text-brand-red hover:text-brand-red-dark"
          >
            daftar baru sekarang
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mt-8 mx-auto w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white">
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>

            {error && (
              <div className="p-3 bg-brand-error-soft text-brand-error rounded-md text-sm border border-brand-error-border">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-brand-gray-900">
                Email / Nomor HP / Username
              </label>
              <div className="mt-1">
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="appearance-none block w-full px-4 py-3.5 text-base sm:text-sm bg-brand-gray-50/50 border border-brand-gray-100 rounded-md shadow-sm placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                  placeholder="08123456789 atau email Anda"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brand-gray-900">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3.5 text-base sm:text-sm bg-brand-gray-50/50 border border-brand-gray-100 rounded-md shadow-sm placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all pr-12"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-gray-400 hover:text-brand-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-brand-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-brand-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-brand-red focus:ring-brand-red border-brand-gray-100 rounded-md"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-brand-gray-900">
                  Ingat saya
                </label>
              </div>

              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-brand-red hover:text-brand-red-dark">
                  Lupa password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-full shadow-[0_8px_20px_rgba(220,38,38,0.25)] text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red disabled:opacity-70 transition-all duration-300 transform active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Masuk'
                )}
              </button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-brand-gray-400">atau masuk dengan</span>
              </div>
            </div>

            <GoogleSignInButton
              text="signin_with"
              onSuccess={async (idToken) => {
                await loginWithGoogle(idToken, rawRedirect ?? undefined, rememberMe);
              }}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-red" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

