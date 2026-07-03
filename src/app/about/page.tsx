import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Tentang Kami</h1>
      <p className="text-gray-500 mb-6 text-center max-w-md">POSKO Jasa adalah platform yang menghubungkan Anda dengan penyedia jasa terpercaya di sekitar Anda.</p>
      <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
      </Link>
    </div>
  );
}
