import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gray-60 px-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-brand-gray-100 max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-brand-red-light rounded-full flex items-center justify-center mb-6">
          <Compass className="w-8 h-8 text-brand-red" />
        </div>
        <h2 className="text-xl font-bold text-brand-gray-900 mb-2">Halaman Tidak Ditemukan</h2>
        <p className="text-sm text-brand-gray-700 mb-6">
          Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-[44px] px-6 rounded-md font-bold text-sm bg-brand-red text-white hover:bg-brand-red-dark transition-colors"
        >
          Ke Beranda
        </Link>
      </div>
    </div>
  );
}
