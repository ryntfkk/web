/** Slugify konsisten dgn backend: lowercase, hanya a-z0-9, sisanya jadi "-". */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
