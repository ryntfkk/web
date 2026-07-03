import { Search, PenTool, Zap, Droplets, SprayCan, Tv, Hammer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceCard } from '@/components/ui/service-card';

const CATEGORIES = [
  { name: 'Reparasi AC', icon: <PenTool className="w-8 h-8 text-[#b51822]" />, count: 24 },
  { name: 'Kelistrikan', icon: <Zap className="w-8 h-8 text-[#b51822]" />, count: 18 },
  { name: 'Saluran Air', icon: <Droplets className="w-8 h-8 text-[#b51822]" />, count: 15 },
  { name: 'Kebersihan', icon: <SprayCan className="w-8 h-8 text-[#b51822]" />, count: 32 },
  { name: 'Peralatan Rumah', icon: <Tv className="w-8 h-8 text-[#b51822]" />, count: 12 },
  { name: 'Renovasi', icon: <Hammer className="w-8 h-8 text-[#b51822]" />, count: 8 },
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
    location: 'Jakarta Selatan',
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
    location: 'Jakarta Barat',
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
    location: 'Jakarta Timur',
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
    location: 'Jakarta Pusat',
  },
];

const FEATURED_SERVICES = [
  {
    vendorName: 'Sinar Teknik Elektronik',
    category: 'Peralatan Rumah',
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
    location: 'Jakarta Selatan',
  },
  {
    vendorName: 'Bersih Indo Services',
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
    category: 'Kelistrikan',
    rating: 4.9,
    reviewCount: 203,
    price: 95000,
    unit: 'kunjungan',
    imageUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=600&auto=format&fit=crop',
    isPro: true,
    location: 'Jakarta Utara',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section - Brand Red Background */}
      <section className="bg-[#b51822] text-white py-12 md:py-20 px-4">
        <div className="container mx-auto max-w-[1200px] px-6">
          <div className="max-w-2xl">
            {/* Display: 32sp Bold */}
            <h1 className="text-[24px] md:text-[32px] font-bold leading-[1.25] mb-4">
              Temukan Ahli Profesional untuk Segala Kebutuhan Rumah Anda
            </h1>
            {/* Body Large: 16sp Regular */}
            <p className="text-[16px] leading-[1.5] mb-8 text-[#f0eded]">
              Pesan jasa reparasi AC, kebersihan, hingga saluran air dengan mudah dan aman.
            </p>

            {/* Mobile Search Bar in Hero */}
            <div className="md:hidden relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search className="h-5 w-5 text-[#8f6f6d]" />
              </div>
              <input
                type="text"
                className="block w-full rounded-full border-none bg-white py-3 pl-11 pr-4 text-[14px] text-[#1c1b1b] placeholder:text-[#8f6f6d] focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="Cari jasa..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-6 py-8 md:py-12 flex-1">

        {/* Categories Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            {/* H2: 20sp SemiBold */}
            <h2 className="text-[20px] font-semibold leading-[1.35] text-[#1c1b1b]">
              Kategori Layanan
            </h2>
            <Button variant="ghost" className="text-[14px]">
              Lihat Semua
            </Button>
          </div>
          {/* Grid: 6 columns on desktop */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {CATEGORIES.map((cat, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center p-4 bg-[#fcf9f8] border border-[#e5e2e1] rounded-[4px] cursor-pointer hover:border-[#b51822] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all"
              >
                <span className="text-3xl mb-2">{cat.icon}</span>
                <span className="text-[14px] font-medium text-[#1c1b1b] text-center leading-tight">
                  {cat.name}
                </span>
                <span className="text-[12px] text-[#5b403e] mt-1">
                  {cat.count} mitra
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Mitra Terpopuler Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            {/* H2: 20sp SemiBold */}
            <h2 className="text-[20px] font-semibold leading-[1.35] text-[#1c1b1b]">
              Mitra Terpopuler
            </h2>
            <Button variant="ghost" className="text-[14px]">
              Lihat Semua
            </Button>
          </div>
          {/* Grid: 4 columns on desktop, gap 16px */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {TOP_PARTNERS.map((partner, idx) => (
              <ServiceCard key={idx} {...partner} />
            ))}
          </div>
        </section>

        {/* Rekomendasi Untukmu Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            {/* H2: 20sp SemiBold */}
            <h2 className="text-[20px] font-semibold leading-[1.35] text-[#1c1b1b]">
              Rekomendasi Untukmu
            </h2>
            <Button variant="ghost" className="text-[14px]">
              Lihat Semua
            </Button>
          </div>
          {/* Grid: 4 columns on desktop, gap 16px */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {FEATURED_SERVICES.map((service, idx) => (
              <ServiceCard key={idx} {...service} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
