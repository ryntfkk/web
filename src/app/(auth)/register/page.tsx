'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { safeRedirect } from '@/lib/utils';
import { Stepper } from '@/components/ui/stepper';
import { PasswordStrength } from '@/components/ui/password-strength';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import LegalConsentCheckbox from '@/components/auth/LegalConsentCheckbox';
import { useActiveLegalDocuments, recordLegalConsent } from '@/hooks/useLegalConsent';

function RegisterContent() {
  const { sendOTP, verifyOTPAndRegister, loginWithGoogle, loading, error, isAuthenticated } = useAuth();
  const router = useRouter();
  // Param mentah (bisa null) . disanitasi saat dipakai, mengikuti pola di /login.
  const rawRedirect = useSearchParams().get('redirect');

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { data: legalDocs } = useActiveLegalDocuments();

  // Begitu akun jadi (atau memang sudah login), antar ke tujuan yang diminta.
  // Sebelumnya SELALU ke '/', jadi niat yang membawa orang ke sini hilang tepat
  // saat ia berhasil mendaftar . pendaftar dari CTA "jadi mitra" mendarat di
  // beranda tanpa tahu harus ke mana. safeRedirect menolak tujuan lintas-origin.
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(safeRedirect(rawRedirect));
    }
  }, [isAuthenticated, router, rawRedirect]);

  // Don't render register form if authenticated
  if (isAuthenticated) {
    return null;
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await sendOTP(phone);
    if (res.success) {
      setStep(2);
    }
  };

  const handleVerifyOTPLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      setStep(3);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    const res = await verifyOTPAndRegister(phone, otp, username, name, password);
    // Dicatat setelah registrasi berhasil, saat token sudah ada. Kegagalan
    // pencatatan tidak membatalkan registrasi . akunnya sudah jadi; gate
    // /legal/pending yang akan menagih persetujuan di kunjungan berikutnya.
    if (res?.success && legalDocs?.length) {
      await recordLegalConsent(legalDocs, ['terms', 'privacy']);
    }
  };

  return (
    <div className="page-h bg-brand-gray-60 flex flex-col sm:justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Stepper steps={['Nomor HP', 'Verifikasi', 'Profil']} current={step} className="mb-6 max-w-xs mx-auto" />
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-brand-gray-900">
          {step === 1 && 'Daftar Akun Baru'}
          {step === 2 && 'Verifikasi OTP'}
          {step === 3 && 'Lengkapi Profil Anda'}
        </h2>
        {step === 1 && (
          <p className="mt-2 text-center text-sm text-brand-gray-700">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-medium text-brand-red hover:text-brand-red-dark">
              Masuk di sini
            </Link>
          </p>
        )}
        {step === 2 && (
          <p className="mt-2 text-center text-sm text-brand-gray-700">
            Masukkan kode 6 digit yang dikirim ke {phone}
          </p>
        )}
      </div>

      <div className="mt-8 sm:mt-10 mx-auto w-full max-w-md px-4 sm:px-0">
        <div className="bg-white/90 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white">
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-100">
              {error}
            </div>
          )}

          {step === 1 && (
            <form className="space-y-6" onSubmit={handleSendOTP}>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-brand-gray-900">
                  Nomor Handphone
                </label>
                <div className="mt-1">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="appearance-none block w-full px-4 py-3.5 bg-brand-gray-50/50 border border-brand-gray-100 rounded-2xl shadow-sm placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white sm:text-sm transition-all"
                    placeholder="081234567890"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-full shadow-[0_8px_20px_rgba(220,38,38,0.25)] text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red disabled:opacity-70 transition-all duration-300 transform active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Kirim OTP'}
                </button>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-brand-gray-100" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-brand-gray-400">atau daftar dengan</span>
                </div>
              </div>

              {/* Daftar via Google juga membuat akun, jadi jalur ini tidak
                  boleh lolos tanpa persetujuan. State `agreed` dipakai bersama
                  dengan form HP di langkah 3 . sekali dicentang, berlaku untuk
                  jalur mana pun yang dipakai pengguna. */}
              <LegalConsentCheckbox checked={agreed} onChange={setAgreed} id="legal-consent-google" />

              <div className={agreed ? '' : 'pointer-events-none opacity-50'} aria-disabled={!agreed}>
                <GoogleSignInButton
                  text="signup_with"
                  onSuccess={async (idToken) => {
                    if (!agreed) return;
                    await loginWithGoogle(idToken, rawRedirect ?? undefined);
                    if (legalDocs?.length) {
                      await recordLegalConsent(legalDocs, ['terms', 'privacy']);
                    }
                  }}
                />
              </div>
            </form>
          )}

          {step === 2 && (
            <form className="space-y-6" onSubmit={handleVerifyOTPLocal}>
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-brand-gray-900">
                  Kode OTP
                </label>
                <div className="mt-1">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="appearance-none block w-full text-center text-2xl tracking-[0.5em] px-4 py-4 bg-brand-gray-50/50 border border-brand-gray-100 rounded-2xl shadow-sm placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                    placeholder="••••••"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <button
                  type="submit"
                  disabled={otp.length < 6}
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-full shadow-[0_8px_20px_rgba(220,38,38,0.25)] text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red disabled:opacity-70 transition-all duration-300 transform active:scale-[0.98]"
                >
                  Selanjutnya
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full flex justify-center items-center py-4 px-4 border border-brand-gray-100 rounded-full shadow-sm text-sm font-bold text-brand-gray-900 bg-white hover:bg-brand-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red transition-all duration-300 transform active:scale-[0.98]"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Ganti Nomor HP
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form className="space-y-6" onSubmit={handleRegister}>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-brand-gray-900">
                  Username
                </label>
                <div className="mt-1">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="appearance-none block w-full px-4 py-3.5 bg-brand-gray-50/50 border border-brand-gray-100 rounded-2xl shadow-sm placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white sm:text-sm transition-all"
                    placeholder="username123"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-brand-gray-900">
                  Nama Lengkap
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full px-4 py-3.5 bg-brand-gray-50/50 border border-brand-gray-100 rounded-2xl shadow-sm placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white sm:text-sm transition-all"
                    placeholder="Budi Santoso"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-brand-gray-900">
                  Buat Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-4 py-3.5 bg-brand-gray-50/50 border border-brand-gray-100 rounded-2xl shadow-sm placeholder-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white sm:text-sm transition-all pr-12"
                    placeholder="Minimal 8 karakter"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-brand-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-brand-gray-400" />
                    )}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              <LegalConsentCheckbox checked={agreed} onChange={setAgreed} />

              <div className="flex flex-col space-y-4">
                <button
                  type="submit"
                  disabled={loading || !agreed}
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-full shadow-[0_8px_20px_rgba(220,38,38,0.25)] text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red disabled:opacity-70 transition-all duration-300 transform active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Selesai & Daftar'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-brand-gray-100 rounded-md shadow-sm text-sm font-bold text-brand-gray-900 bg-white hover:bg-brand-gray-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Kembali
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// useSearchParams menuntut batas Suspense agar halaman tetap bisa dirender
// statis . pola yang sama dipakai /login.
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="page-h flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
