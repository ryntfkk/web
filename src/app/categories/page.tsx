import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import CategoriesClient from './CategoriesClient';
import type { Category } from '@/types/category';

// P2/SE2: /categories di-SSR (kategori masuk HTML awal → kebaca crawler + LCP
// cepat). Pola sama seperti Home: prefetch queryKey ['categories'] lalu hydrate;
// CategoriesClient (interaktif) hydrate tanpa refetch.
export const revalidate = 300;

const API = 'https://api.poskojasa.com/api/v1';

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API}/categories`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: ['categories'], queryFn: getCategories });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CategoriesClient />
    </HydrationBoundary>
  );
}
