'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

function LoginContent() {
  const { login, loading, error, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectUrl);
    }
  }, [isAuthenticated, router, redirectUrl]);

  // Don't render login form if authenticated
  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(identifier, password, rememberMe, redirectUrl);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-neutral-900">
          Masuk ke akun Anda
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-600">
          Atau{' '}
          <Link href="/register" className="font-medium text-[#b51822] hover:text-[#90121a]">
            daftar baru sekarang
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-4 sm:px-10 border border-neutral-200 rounded-[2px] shadow-sm">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-[2px] text-sm border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-neutral-700">
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
                  className="appearance-none block w-full px-3 py-2.5 border border-neutral-300 rounded-[2px] shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-[#b51822] focus:border-[#b51822] sm:text-sm"
                  placeholder="08123456789 atau email Anda"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
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
                  className="appearance-none block w-full px-3 py-2.5 border border-neutral-300 rounded-[2px] shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-[#b51822] focus:border-[#b51822] sm:text-sm pr-10"
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

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#b51822] focus:ring-[#b51822] border-neutral-300 rounded-[2px]"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-900">
                  Ingat saya
                </label>
              </div>

              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-[#b51822] hover:text-[#90121a]">
                  Lupa password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-[2px] shadow-sm text-sm font-bold text-white bg-[#b51822] hover:bg-[#90121a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b51822] disabled:opacity-70 transition-all duration-200"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Masuk'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#b51822]" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
