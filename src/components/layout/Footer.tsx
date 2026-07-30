"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Globe, Share2, AtSign, Send } from 'lucide-react';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Perusahaan',
    links: [
      { label: 'Tentang Kami', href: '/about' },
      { label: 'Kebijakan Privasi', href: '/privacy' },
      { label: 'Syarat & Ketentuan', href: '/terms' },
    ],
  },
  {
    title: 'Layanan',
    links: [
      { label: 'Kategori', href: '/categories' },
      { label: 'Semua Layanan', href: '/search' },
      { label: 'Promo', href: '/promos' },
    ],
  },
  {
    title: 'Bantuan',
    links: [
      { label: 'FAQ', href: '/help' },
      { label: 'Chat CS', href: '/chat' },
    ],
  },
];

// Placeholder sosial media — ganti href '#' & ikon generik dengan URL/ikon
// resmi saat akun sosial tersedia.
const SOCIAL_LINKS = [
  { label: 'Website', href: '#', icon: Globe },
  { label: 'Media Sosial', href: '#', icon: Share2 },
  { label: 'Email', href: '#', icon: AtSign },
  { label: 'Kirim Pesan', href: '#', icon: Send },
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/chat')) return null;

  return (
    <footer className="hidden md:block w-full bg-brand-gray-60 border-t border-brand-gray-100 mt-auto">
      <div className="container mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-10">
        {/* Kolom tautan */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-[14px] font-semibold text-brand-gray-900 mb-3">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-brand-gray-700 hover:text-brand-red transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Ikuti Kami */}
          <div>
            <h3 className="text-[14px] font-semibold text-brand-gray-900 mb-3">
              Ikuti Kami
            </h3>
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-white border border-brand-gray-100 flex items-center justify-center text-brand-gray-700 hover:text-brand-red hover:border-brand-red transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bar bawah */}
        <div className="mt-10 pt-6 border-t border-brand-gray-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-[13px] text-brand-gray-700">
            <span>&copy; {new Date().getFullYear()} POSKO JASA</span>
            <span className="hidden md:inline text-brand-gray-400">·</span>
            <span>Platform Marketplace Jasa Terpercaya</span>
          </div>
          <p className="flex items-center gap-1.5 text-[13px] text-brand-gray-700">
            <ShieldCheck className="w-4 h-4 text-brand-success" />
            Pembayaran aman & terenkripsi
          </p>
        </div>
      </div>
    </footer>
  );
}
