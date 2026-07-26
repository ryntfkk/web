/** Strongly-typed category from the API (backend now sends clean JSON). */
export interface Category {
  id: string;
  name: string;
  icon_url: string | null;
  is_active: boolean;
  // Hierarki 2 level. parent_id null = kategori utama; terisi = subkategori.
  slug: string | null;
  parent_id: string | null;
  sort_order: number;
}
