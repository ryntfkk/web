import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="page-h bg-gray-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Syarat & Ketentuan</h1>
      <p className="text-gray-500 mb-6 text-center max-w-md">Halaman Syarat & Ketentuan saat ini sedang dalam proses penyusunan dan akan segera tersedia.</p>
      <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-[#b51822] text-white rounded-md hover:bg-[#90121a] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
      </Link>
    </div>
  );
}

