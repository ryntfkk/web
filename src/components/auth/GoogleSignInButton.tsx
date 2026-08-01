'use client';

import { useEffect, useRef, useState } from 'react';

interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => void;
  onError?: (error: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              type?: 'standard' | 'icon';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string | number;
              locale?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  text = 'continue_with',
}: GoogleSignInButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  // Callback disimpan di ref, JANGAN dipakai sebagai dependency effect di bawah.
  // Pemanggil (halaman login/register) mengoper arrow function inline, sehingga
  // identitasnya baru pada SETIAP render. Kalau effect render tombol bergantung
  // padanya, tiap ketikan satu huruf akan menghapus (innerHTML = '') lalu membuat
  // ulang iframe tombol Google — dan di mobile pembongkaran iframe di dekat input
  // yang sedang fokus membuat fokus lepas → keyboard menutup sendiri.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    // Check if script is already present
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      onErrorRef.current?.('Gagal memuat Google Sign-In script');
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !window.google?.accounts?.id || !btnRef.current) return;

    if (!clientId) {
      console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID belum diatur di .env.web');
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            onSuccessRef.current(response.credential);
          } else {
            onErrorRef.current?.('Gagal mendapatkan respon dari Google');
          }
        },
      });

      // Clear any previous rendered button inside container
      btnRef.current.innerHTML = '';

      // Get the container width, or fallback to a safe width for mobile (240px for small screens like iPhone SE)
      const containerWidth = btnRef.current.clientWidth || 240;
      // Google button width can be between 200 and 400
      const btnWidth = Math.max(200, Math.min(containerWidth, 400));

      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        text: text,
        shape: 'pill',
        width: btnWidth.toString(),
        locale: 'id',
      });
    } catch (err) {
      console.error('Failed to render Google Sign-In button', err);
    }
    // Deps sengaja hanya nilai yang benar-benar mengubah tampilan tombol.
    // Callback diakses lewat ref (lihat catatan di atas) supaya render ulang
    // induk tidak membongkar-pasang iframe Google.
  }, [scriptLoaded, clientId, text]);

  if (!clientId) {
    return (
      <div className="w-full text-center p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
        Google Sign-In memerlukan <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> di file <code>.env.web</code>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center my-2">
      <div ref={btnRef} className="min-h-[40px] flex justify-center w-full max-w-xs" />
    </div>
  );
}
