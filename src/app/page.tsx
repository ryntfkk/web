import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceCard } from '@/components/ui/service-card';

const CATEGORIES = [
  { name: 'AC', icon: '❄️', count: 24 },
  { name: 'Listrik', icon: '⚡', count: 18 },
  { name: 'Air', icon: '🚰', count: 15 },
  { name: 'Bersih', icon: '🧹', count: 32 },
  { name: 'Elektronik', icon: '📺', count: 12 },
  { name: 'Renovasi', icon: '🔨', count: 8 },
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
      {/* Hero Section - Brand Red Background */}
      <section className="bg-[#b51822] text-white py-8 sm:py-12 md:py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="max-w-2xl">
            {/* Display: Responsive font size */}
            <h1 className="text-[20px] sm:text-[22px] md:text-[32px] font-bold leading-[1.25] mb-2 sm:mb-4">
              Temukan Ahli Profesional untuk Segala Kebutuhan Rumah
            </h1>
            {/* Body Large: Responsive */}
            <p className="text-[14px] sm:text-[16px] leading-[1.5] mb-4 sm:mb-6 text-[#f0eded]">
              Pesan jasa reparasi AC, kebersihan, hingga saluran air dengan mudah.
            </p>

            {/* Mobile Search Bar in Hero - Better sizing */}
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-[#8f6f6d]" />
              </div>
              <input
                type="text"
                className="block w-full rounded-full border-none bg-white py-2.5 sm:py-3 pl-10 sm:pl-12 pr-4 text-[14px] sm:text-[14px] text-[#1c1b1b] placeholder:text-[#8f6f6d] focus:outline-none focus:ring-2 focus:ring-white shadow-md"
                placeholder="Cari jasa..."
              />
            </div>
          </div>
        </div>
      </section>

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
          {/* Grid: 2 columns on mobile, 3 on small tablet, 6 on desktop */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {CATEGORIES.map((cat, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-[#fcf9f8] border border-[#e5e2e1] rounded-[4px] cursor-pointer hover:border-[#b51822] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all"
              >
                <span className="text-2xl sm:text-3xl mb-1 sm:mb-2">{cat.icon}</span>
                <span className="text-[11px] sm:text-[13px] md:text-[14px] font-medium text-[#1c1b1b] text-center leading-tight">
                  {cat.name}
                </span>
                <span className="text-[10px] sm:text-[11px] md:text-[12px] text-[#5b403e] mt-0.5 sm:mt-1 hidden sm:block">
                  {cat.count} mitra
                </span>
              </div>
            ))}
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
