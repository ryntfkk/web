"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global boundary caught an error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f5f4] px-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-[#e5e2e1] max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-[#b51822]" />
        </div>
        <h2 className="text-xl font-bold text-[#1c1b1b] mb-2">Terjadi Kesalahan</h2>
        <p className="text-sm text-[#5b403e] mb-6">
          Maaf, terjadi kesalahan tak terduga pada sistem kami. Tim kami telah diberitahu.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Ke Beranda
          </Button>
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-[#b51822] hover:bg-[#90121a] text-white"
          >
            Coba Lagi
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 text-left bg-gray-50 p-4 rounded-lg overflow-auto max-h-48 border border-gray-200">
            <p className="text-xs font-mono text-red-600 break-all">{error.message}</p>
            {error.stack && (
              <pre className="text-[10px] font-mono text-gray-500 mt-2 whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
