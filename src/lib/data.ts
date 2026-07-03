export interface Category {
  name: string;
  icon: string;
  count: number;
}

export interface ServicePartner {
  vendorName: string;
  category: string;
  rating: number;
  reviewCount: number;
  price: number;
  unit: string;
  imageUrl: string;
  isPro: boolean;
  location: string;
}

export const CATEGORIES: Category[] = [
  { name: 'Service AC', icon: '/icons/air-conditioner.png', count: 124 },
  { name: 'Kelistrikan', icon: '/icons/electrician.png', count: 85 },
  { name: 'Kebersihan', icon: '/icons/janitor.png', count: 210 },
  { name: 'Renovasi', icon: '/icons/handyman.png', count: 64 },
  { name: 'Cuci Mobil', icon: '/icons/car-wash.png', count: 42 },
  { name: 'Babysitter', icon: '/icons/babysitter.png', count: 38 },
  { name: 'Service HP', icon: '/icons/phonerepair.png', count: 91 },
];

export const TOP_PARTNERS: ServicePartner[] = [
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

export const FEATURED_SERVICES: ServicePartner[] = [
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
