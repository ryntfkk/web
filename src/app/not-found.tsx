import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f5f4] px-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-[#e5e2e1] max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-[#f0eded] rounded-full flex items-center justify-center mb-6">
          <Compass className="w-8 h-8 text-[#b51822]" />
        </div>
        <h2 className="text-xl font-bold text-[#1c1b1b] mb-2">Halaman Tidak Ditemukan</h2>
        <p className="text-sm text-[#5b403e] mb-6">
          Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-[44px] px-6 rounded-md font-bold text-sm bg-[#b51822] text-white hover:bg-[#90121a] transition-colors"
        >
          Ke Beranda
        </Link>
      </div>
    </div>
  );
}
