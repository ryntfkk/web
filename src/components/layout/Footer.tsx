export default function Footer() {
  return (
    <footer className="w-full bg-brand-gray-100 py-6 mt-12 border-t border-border">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between">
        <div className="flex flex-col items-center md:items-start gap-2">
          {/* Copyright Footer - 14sp Medium 0.7px tracking */}
          <p className="text-[14px] font-medium tracking-[0.7px] text-brand-gray-700">
            &copy; 2024 POSKO JASA
          </p>
          <p className="text-xs text-brand-gray-400">
            Platform Marketplace Jasa Terpercaya
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-4 text-sm text-brand-gray-700">
          <a href="#" className="hover:text-brand-red">Tentang Kami</a>
          <a href="#" className="hover:text-brand-red">Bantuan</a>
          <a href="#" className="hover:text-brand-red">Syarat & Ketentuan</a>
        </div>
      </div>
    </footer>
  );
}
