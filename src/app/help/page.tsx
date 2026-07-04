import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Bantuan & Dukungan</h1>
      <p className="text-gray-500 mb-6 text-center max-w-md">Pusat bantuan sedang dikembangkan. Jika Anda membutuhkan bantuan mendesak, silakan hubungi kami via WhatsApp.</p>
      <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-[#b51822] text-white rounded-[2px] hover:bg-[#90121a] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
      </Link>
    </div>
  );
}
