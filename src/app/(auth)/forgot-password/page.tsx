'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form State
  const [identifier, setIdentifier] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetchAPI('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      });
      if (!res.success) {
        throw new Error(getErrorMessage(res));
      }
      setSuccess('Kode pemulihan telah dikirim ke perangkat/email Anda');
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim permintaan pemulihan. Pastikan akun terdaftar.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await fetchAPI('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ identifier, token, password }),
      });
      if (!res.success) {
        throw new Error(getErrorMessage(res));
      }
      setSuccess('Password berhasil diubah. Mengalihkan...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah password. Token mungkin salah atau kadaluarsa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-neutral-900">
          Lupa Password
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-600">
          {step === 1 ? 'Masukkan identitas akun untuk pemulihan' : 'Verifikasi token dan buat password baru'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-4 sm:px-10 border border-neutral-200 rounded-[2px] shadow-sm">
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-[2px] text-sm border border-red-100">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-3 bg-green-50 text-green-700 rounded-[2px] text-sm border border-green-100">
              {success}
            </div>
          )}

          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleRequestOTP}>
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-neutral-700">
                  Email / Nomor HP / Username
                </label>
                <div className="mt-1">
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="appearance-none block w-full px-3 py-2.5 border border-neutral-300 rounded-[2px] shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-[#b51822] focus:border-[#b51822] sm:text-sm"
                    placeholder="08123456789 atau email Anda"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <button
                  type="submit"
                  disabled={loading || !identifier}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-[2px] shadow-sm text-sm font-bold text-white bg-[#b51822] hover:bg-[#90121a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b51822] disabled:opacity-70 transition-all duration-200"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Kirim Kode Pemulihan'}
                </button>
                
                <Link
                  href="/login"
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-neutral-300 rounded-[2px] shadow-sm text-sm font-bold text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b51822] transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Kembali ke Login
                </Link>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-neutral-700">
                  Kode Token / OTP
                </label>
                <div className="mt-1">
                  <input
                    id="token"
                    name="token"
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="appearance-none block w-full px-3 py-2.5 border border-neutral-300 rounded-[2px] shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-[#b51822] focus:border-[#b51822] sm:text-sm tracking-widest text-center"
                    placeholder="Masukkan kode dari email/SMS"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                  Password Baru
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

              <div className="flex flex-col space-y-4">
                <button
                  type="submit"
                  disabled={loading || !token || password.length < 8}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-[2px] shadow-sm text-sm font-bold text-white bg-[#b51822] hover:bg-[#90121a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b51822] disabled:opacity-70 transition-all duration-200"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Ubah Password'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setSuccess('');
                    setError('');
                  }}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-neutral-300 rounded-[2px] shadow-sm text-sm font-bold text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b51822] transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Ganti Identitas
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
