'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const { registerPhone, verifyOTP, loading, error, isAuthenticated } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [otp, setOtp] = useState('');

  if (isAuthenticated) {
    router.replace('/');
    return null;
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await registerPhone(phone, name, password);
    if (res.success) {
      setStep(2);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyOTP(phone, otp);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-neutral-900">
          {step === 1 ? 'Daftar Akun Baru' : 'Verifikasi OTP'}
        </h2>
        {step === 1 && (
          <p className="mt-2 text-center text-sm text-neutral-600">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-medium text-[#b51822] hover:text-[#90121a]">
              Masuk di sini
            </Link>
          </p>
        )}
        {step === 2 && (
          <p className="mt-2 text-center text-sm text-neutral-600">
            Masukkan kode 6 digit yang dikirim ke {phone}
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-4 sm:px-10 border border-neutral-200 rounded-[2px] shadow-sm">
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-[2px] text-sm border border-red-100">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleRegister}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
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
                    className="appearance-none block w-full px-3 py-2.5 border border-neutral-300 rounded-[2px] shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-[#b51822] focus:border-[#b51822] sm:text-sm"
                    placeholder="Budi Santoso"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700">
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
                    className="appearance-none block w-full px-3 py-2.5 border border-neutral-300 rounded-[2px] shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-[#b51822] focus:border-[#b51822] sm:text-sm"
                    placeholder="081234567890"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                  Buat Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2.5 border border-neutral-300 rounded-[2px] shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-[#b51822] focus:border-[#b51822] sm:text-sm pr-10"
                    placeholder="Minimal 8 karakter"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-neutral-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-neutral-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-[2px] shadow-sm text-sm font-bold text-white bg-[#b51822] hover:bg-[#90121a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b51822] disabled:opacity-70 transition-all duration-200"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Lanjut'}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyOTP}>
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-neutral-700">
                  Kode OTP
                </label>
                <div className="mt-1">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="appearance-none block w-full text-center text-2xl tracking-[0.5em] px-3 py-3 border border-neutral-300 rounded-[2px] shadow-sm placeholder-neutral-300 focus:outline-none focus:ring-[#b51822] focus:border-[#b51822]"
                    placeholder="••••••"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-[2px] shadow-sm text-sm font-bold text-white bg-[#b51822] hover:bg-[#90121a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b51822] disabled:opacity-70 transition-all duration-200"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Verifikasi & Masuk'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-neutral-300 rounded-[2px] shadow-sm text-sm font-bold text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b51822] transition-all duration-200"
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
