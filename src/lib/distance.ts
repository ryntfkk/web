// Format jarak (meter) jadi teks ringkas. Mengembalikan undefined bila 0/kosong
// (mis. lokasi user tidak dikirim) sehingga UI bisa menyembunyikan barisnya.
export function formatDistanceMeters(meters?: number | null): string | undefined {
  if (!meters || meters <= 0) return undefined;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
