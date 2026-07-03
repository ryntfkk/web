import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceCard } from '@/components/ui/service-card';

const CATEGORIES = [
  { name: 'Reparasi AC', icon: '❄️' },
  { name: 'Kelistrikan', icon: '⚡' },
  { name: 'Saluran Air', icon: '🚰' },
  { name: 'Kebersihan', icon: '🧹' },
  { name: 'Peralatan Rumah', icon: '📺' },
  { name: 'Renovasi', icon: '🔨' },
];

const TOP_PARTNERS = [
  {
    vendorName: 'Budi Teknik AC',
    category: 'Reparasi AC',
    rating: 4.9,
    reviewCount: 128,
    price: 75000,
    unit: 'kunjungan',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=600&auto=format&fit=crop',
    isPro: true,
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
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Hero Section */}
      <section className="bg-brand-red text-white py-12 md:py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h1 className="text-[24px] md:text-[32px] font-bold leading-tight mb-4">
              Temukan Ahli Profesional untuk Segala Kebutuhan Rumah Anda
            </h1>
            <p className="text-base md:text-lg mb-8 text-brand-red-light">
              Pesan jasa reparasi AC, kebersihan, hingga saluran air dengan mudah dan aman.
            </p>
            
            {/* Mobile Search Bar in Hero */}
            <div className="md:hidden flex w-full relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-brand-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full rounded-full border-none bg-white py-3 pl-10 pr-4 text-sm text-brand-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="Cari jasa..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex-1">
        
        {/* Categories Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[20px] font-semibold text-brand-gray-900">Kategori Layanan</h2>
            <Button variant="link" className="text-brand-red p-0 h-auto font-medium">Lihat Semua</Button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {CATEGORIES.map((cat, idx) => (
              <div 
                key={idx} 
                className="flex flex-col items-center justify-center p-4 bg-brand-gray-50 border border-border rounded-xl cursor-pointer hover:border-brand-red hover:shadow-sm transition-all"
              >
                <span className="text-3xl mb-2">{cat.icon}</span>
                <span className="text-xs font-medium text-brand-gray-900 text-center">{cat.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Top Partners Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[20px] font-semibold text-brand-gray-900">Mitra Terpopuler</h2>
            <Button variant="link" className="text-brand-red p-0 h-auto font-medium">Lihat Semua</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {TOP_PARTNERS.map((partner, idx) => (
              <ServiceCard key={idx} {...partner} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
