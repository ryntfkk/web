import { PenTool, Zap, Droplets, SprayCan, Tv, Hammer } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ServiceCard } from '@/components/ui/service-card';
import HeroCarousel from '@/components/ui/hero-carousel';

const CATEGORIES = [
  { name: 'Service AC', icon: '/icons/air-conditioner.png', count: 124 },
  { name: 'Kelistrikan', icon: '/icons/electrician.png', count: 85 },
  { name: 'Kebersihan', icon: '/icons/janitor.png', count: 210 },
  { name: 'Renovasi', icon: '/icons/handyman.png', count: 64 },
  { name: 'Cuci Mobil', icon: '/icons/car-wash.png', count: 42 },
  { name: 'Babysitter', icon: '/icons/babysitter.png', count: 38 },
  { name: 'Service HP', icon: '/icons/phonerepair.png', count: 91 },
];

const TOP_PARTNERS = [
  {
    vendorName: 'Budi Teknik AC - Service & Reparasi AC Profesional',
    category: 'Budi Teknik',
    rating: 4.9,
    reviewCount: 128,
    price: 150000,
    unit: 'kunjungan',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=600&auto=format&fit=crop',
    isPro: true,
    location: 'Jakarta',
  },
  {
    vendorName: 'Maju Jaya Plumbing',
    category: 'Saluran Air',
    rating: 4.8,
    reviewCount: 95,
    price: 100000,
    unit: 'jam',
    imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=600&auto=format&fit=crop',
    isPro: true,
    location: 'Jakarta',
  },
  {
    vendorName: 'KlinKlin Cleaners',
    category: 'Kebersihan',
    rating: 4.7,
    reviewCount: 210,
    price: 50000,
    unit: 'ruangan',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=600&auto=format&fit=crop',
    isPro: false,
    location: 'Jakarta',
  },
  {
    vendorName: 'Elektro Super',
    category: 'Kelistrikan',
    rating: 4.9,
    reviewCount: 64,
    price: 85000,
    unit: 'kunjungan',
    imageUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=600&auto=format&fit=crop',
    isPro: true,
    location: 'Jakarta',
  },
];

const FEATURED_SERVICES = [
  {
    vendorName: 'Sinar Teknik Elektronik',
    category: 'Peralatan',
    rating: 4.6,
    reviewCount: 78,
    price: 75000,
    unit: 'unit',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=600&auto=format&fit=crop',
    isPro: false,
    location: 'Bandung',
  },
  {
    vendorName: 'Rapi Renovasi',
    category: 'Renovasi',
    rating: 4.8,
    reviewCount: 45,
    price: 500000,
    unit: 'hari',
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop',
    isPro: true,
    location: 'Jakarta',
  },
  {
    vendorName: 'Bersih Indo',
    category: 'Kebersihan',
    rating: 4.5,
    reviewCount: 156,
    price: 45000,
    unit: 'jam',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=600&auto=format&fit=crop',
    isPro: true,
    location: 'Tangerang',
  },
  {
    vendorName: 'Ahli Listrik Bersertifikat',
    category: 'Listrik',
    rating: 4.9,
    reviewCount: 203,
    price: 95000,
    unit: 'kunjungan',
    imageUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=600&auto=format&fit=crop',
    isPro: true,
    location: 'Jakarta',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section - Auto-sliding Carousel */}
      <HeroCarousel />

      {/* Main Content Area - Better mobile padding */}
      <div className="container mx-auto max-w-[1200px] px-3 sm:px-4 sm:px-6 lg:px-6 py-6 sm:py-8 md:py-12 flex-1">

        {/* Categories Section - Better mobile spacing */}
        <section className="mb-6 sm:mb-10 md:mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            {/* H2: Responsive font size */}
            <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-[#1c1b1b]">
              Kategori
            </h2>
            <Button variant="ghost" className="text-[12px] sm:text-[14px] h-auto py-1">
              Lihat Semua
            </Button>
          </div>
          {/* Grid: 4 columns on mobile, 8 on desktop */}
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
            {CATEGORIES.map((cat, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-[#fcf9f8] border border-[#e5e2e1] rounded-[4px] cursor-pointer hover:border-[#b51822] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all"
              >
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 mb-1 sm:mb-2">
                  <Image src={cat.icon} alt={cat.name} fill className="object-contain" />
                </div>
                <span className="text-[10px] sm:text-[12px] md:text-[14px] font-medium text-[#1c1b1b] text-center leading-tight">
                  {cat.name}
                </span>
              </div>
            ))}
            
            {/* Tombol Lihat Semua Kategori */}
            <Link href="/categories" className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-white border border-dashed border-[#e5e2e1] rounded-[4px] cursor-pointer hover:border-[#b51822] transition-all">
              <div className="w-8 h-8 sm:w-10 sm:h-10 mb-1 sm:mb-2 flex items-center justify-center bg-[#f0eded] rounded-full">
                <span className="text-[#b51822] font-bold text-[20px]">+</span>
              </div>
              <span className="text-[10px] sm:text-[12px] md:text-[14px] font-medium text-[#b51822] text-center leading-tight">
                Lainnya
              </span>
            </Link>
          </div>
        </section>

        {/* Mitra Terpopuler Section - Better mobile spacing */}
        <section className="mb-6 sm:mb-10 md:mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            {/* H2: Responsive font size */}
            <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-[#1c1b1b]">
              Mitra Terpopuler
            </h2>
            <Button variant="ghost" className="text-[12px] sm:text-[14px] h-auto py-1">
              Lihat Semua
            </Button>
          </div>
          {/* Grid: 2 columns on mobile, 2-3 on tablet, 4 on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {TOP_PARTNERS.map((partner, idx) => (
              <ServiceCard key={idx} {...partner} />
            ))}
          </div>
        </section>

        {/* Rekomendasi Untukmu Section - Better mobile spacing */}
        <section className="mb-6 sm:mb-10 md:mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            {/* H2: Responsive font size */}
            <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-[#1c1b1b]">
              Rekomendasi
            </h2>
            <Button variant="ghost" className="text-[12px] sm:text-[14px] h-auto py-1">
              Lihat Semua
            </Button>
          </div>
          {/* Grid: 2 columns on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {FEATURED_SERVICES.map((service, idx) => (
              <ServiceCard key={idx} {...service} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
