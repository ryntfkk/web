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
      if (onError) onError('Gagal memuat Google Sign-In script');
    };
    document.body.appendChild(script);
  }, [onError]);

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
            onSuccess(response.credential);
          } else if (onError) {
            onError('Gagal mendapatkan respon dari Google');
          }
        },
      });

      // Clear any previous rendered button inside container
      btnRef.current.innerHTML = '';

      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        text: text,
        shape: 'rectangular',
        width: '360',
        locale: 'id',
      });
    } catch (err) {
      console.error('Failed to render Google Sign-In button', err);
    }
  }, [scriptLoaded, clientId, onSuccess, onError, text]);

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
