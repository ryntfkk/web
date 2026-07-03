import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-[#e5e2e1] py-6 mt-auto">
      <div className="container mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center md:items-start gap-1">
          {/* Copyright Footer - 14sp Medium 0.7px tracking */}
          <p className="text-[14px] font-medium tracking-[0.7px] text-[#5b403e]">
            &copy; 2024 POSKO JASA
          </p>
          <p className="text-[12px] text-[#5b403e]">
            Platform Marketplace Jasa Terpercaya
          </p>
        </div>

        <nav className="flex flex-wrap justify-center gap-4 text-[14px] text-[#5b403e]">
          <Link href="/about" className="hover:text-[#b51822] transition-colors">
            Tentang Kami
          </Link>
          <Link href="/help" className="hover:text-[#b51822] transition-colors">
            Bantuan
          </Link>
          <Link href="/terms" className="hover:text-[#b51822] transition-colors">
            Syarat & Ketentuan
          </Link>
          <Link href="/privacy" className="hover:text-[#b51822] transition-colors">
            Kebijakan Privasi
          </Link>
        </nav>
      </div>
    </footer>
  );
}
