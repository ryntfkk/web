/** Strongly-typed category from the API (backend now sends clean JSON). */
export interface Category {
  id: string;
  name: string;
  icon_url: string | null;
  is_active: boolean;
}
