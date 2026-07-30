'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Stepper } from '@/components/ui/stepper';
import { PasswordStrength } from '@/components/ui/password-strength';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

export default function RegisterPage() {
  const { sendOTP, verifyOTPAndRegister, loginWithGoogle, loading, error, isAuthenticated } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

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
    await verifyOTPAndRegister(phone, otp, username, name, password);
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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="py-6 px-1 sm:px-2">
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
                    className="appearance-none block w-full px-3 py-2.5 border border-brand-gray-100 rounded-md shadow-sm placeholder-brand-gray-400 focus:outline-none focus:ring-brand-red focus:border-brand-red sm:text-sm"
                    placeholder="081234567890"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red disabled:opacity-70 transition-all duration-200"
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

              <GoogleSignInButton
                text="signup_with"
                onSuccess={async (idToken) => {
                  await loginWithGoogle(idToken);
                }}
              />
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
                    className="appearance-none block w-full text-center text-2xl tracking-[0.5em] px-3 py-3 border border-brand-gray-100 rounded-md shadow-sm placeholder-brand-gray-400 focus:outline-none focus:ring-brand-red focus:border-brand-red"
                    placeholder="••••••"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <button
                  type="submit"
                  disabled={otp.length < 6}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red disabled:opacity-70 transition-all duration-200"
                >
                  Selanjutnya
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-brand-gray-100 rounded-md shadow-sm text-sm font-bold text-brand-gray-900 bg-white hover:bg-brand-gray-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red transition-all duration-200"
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
                    className="appearance-none block w-full px-3 py-2.5 border border-brand-gray-100 rounded-md shadow-sm placeholder-brand-gray-400 focus:outline-none focus:ring-brand-red focus:border-brand-red sm:text-sm"
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
                    className="appearance-none block w-full px-3 py-2.5 border border-brand-gray-100 rounded-md shadow-sm placeholder-brand-gray-400 focus:outline-none focus:ring-brand-red focus:border-brand-red sm:text-sm"
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
                    className="appearance-none block w-full px-3 py-2.5 border border-brand-gray-100 rounded-md shadow-sm placeholder-brand-gray-400 focus:outline-none focus:ring-brand-red focus:border-brand-red sm:text-sm pr-10"
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

              <div className="flex flex-col space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red disabled:opacity-70 transition-all duration-200"
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

