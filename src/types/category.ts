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
  /**
   * Hanya diisi untuk SUBkategori (endpoint /categories/{id}/subcategories):
   * true bila ada minimal satu layanan yang bisa dipesan (mitra aktif) di
   * subkategori itu. undefined untuk kategori utama / respons lama backend.
   */
  has_services?: boolean;
}
