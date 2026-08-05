"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/api';
import { slugify } from '@/lib/slug';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import type { Category } from '@/types/category';

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
      { label: 'Semua Layanan', href: '/services' },
      { label: 'Promo', href: '/promos' },
    ],
  },
  {
    title: 'Bantuan',
    links: [
      { label: 'FAQ', href: '/help' },
      { label: 'Chat CS', href: '/bantuan' },
      { label: 'Hapus Akun', href: '/hapus-akun' },
    ],
  },
];

// SE: "Jasa Populer" . link ke landing lokal /jasa/[slug]/[kota] dari setiap
// halaman (footer tampil di semua page). Bantu Google discover landing lokal
// + navigasi pelanggan. Fetch kategori utama + kota mitra via React Query;
// link selalu valid (slug & kota dari API, bukan hardcode).
const MAX_POPULAR_CATEGORIES = 4;
const MAX_POPULAR_CITIES = 3;

function useFooterPopularLinks() {
  return useQuery({
    queryKey: ['footer-popular-links'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [catsRes, citiesRes] = await Promise.all([
        fetchAPI<Category[]>('/categories'),
        fetchAPI<string[]>('/partners/cities'),
      ]);
      const mainCats = (catsRes.data ?? [])
        .filter((c) => !c.parent_id && c.slug && c.is_active)
        .slice(0, MAX_POPULAR_CATEGORIES);
      const cities = (citiesRes.data ?? [])
        .filter(Boolean)
        .slice(0, MAX_POPULAR_CITIES);
      // Kombinasi: kategori × kota, ambil 8 pertama (jangan terlalu padat).
      const links: FooterLink[] = [];
      for (const cat of mainCats) {
        for (const city of cities) {
          if (!cat.slug) continue;
          const citySlug = slugify(city);
          if (!citySlug) continue;
          links.push({
            label: `${cat.name} ${city}`,
            href: `/jasa/${cat.slug}/${citySlug}`,
          });
          if (links.length >= 8) return links;
        }
      }
      return links;
    },
  });
}

export default function Footer() {
  const pathname = usePathname();
  // Hook dipanggil sebelum early-return agar rules-of-hooks terpenuhi.
  const { data: popularLinks } = useFooterPopularLinks();
  const { profile } = usePlatformConfig();
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

          {/* Jasa Populer . landing lokal */}
          {popularLinks && popularLinks.length > 0 && (
            <nav aria-label="Jasa Populer">
              <h3 className="text-[14px] font-semibold text-brand-gray-900 mb-3">
                Jasa Populer
              </h3>
              <ul className="flex flex-col gap-2.5">
                {popularLinks.map((link) => (
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
          )}
        </div>

        {/* Bar bawah */}
        <div className="mt-10 pt-6 border-t border-brand-gray-100 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Identitas & kontak dari platform_profile. Field kosong tidak
              dirender . lebih baik absen daripada mencetak placeholder yang
              terbaca seperti data hilang. */}
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-[13px] text-brand-gray-700">
            <span>&copy; {new Date().getFullYear()} {profile?.legal_name || profile?.brand_name || 'POSKO JASA'}</span>
            <span className="hidden md:inline text-brand-gray-400">·</span>
            <span>Platform Marketplace Jasa Terpercaya</span>
            {profile?.support_email && (
              <>
                <span className="hidden md:inline text-brand-gray-400">·</span>
                <a href={`mailto:${profile.support_email}`} className="hover:text-brand-red transition-colors">
                  {profile.support_email}
                </a>
              </>
            )}
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
