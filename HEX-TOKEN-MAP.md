# Hex → Token Mapping (Fase 0 Hex Sweep)

> Referensi tunggal untuk migrasi hex hardcode → token desain di `web/src/`.
> Token didefinisikan di `web/src/app/globals.css` bagian `@theme inline`.
> **Dilarang** menambah hex `#[0-9a-fA-F]{6}` baru di `src/` di luar `globals.css`.

## Aturan

1. Ganti `bg-[#xxxx]` → `bg-brand-xxx`, `text-[#xxxx]` → `text-brand-xxx`, `border-[#xxxx]` → `border-brand-xxx`.
2. Jika hex TIDAK ada di tabel di bawah, JANGAN tebak — catat di laporan akhir dengan path:line:hex supaya ditambahkan ke token.
3. Jangan sentuh `globals.css`, `manifest.ts`.
4. Jangan ganti hex di inline `style={{ color: '#...' }}` jika itu nilai dinamis dari API/data — hanya ganti yang literal statis.
5. `#fff`/`#ffffff` → `bg-white`/`text-white` (bukan token). `#000`/`#000000` → `bg-black`/`text-black`.
6. Setelah edit, jalankan `npx tsc --noEmit -p web` dari root untuk verifikasi tidak ada error tipe baru.

## Tabel Pemetaan

| Hex | Token utility | Catatan |
|-----|---------------|---------|
| `#b51822` | `brand-red` | primary/CTA |
| `#90121a` | `brand-red-dark` | |
| `#f0eded` | `brand-red-light` | secondary/accent |
| `#1e4fd6` | `brand-blue` | link/focus |
| `#1a3fb0` | `brand-blue-dark` | |
| `#e8eefc` | `brand-blue-light` | |
| `#f4f7fe` | `brand-blue-50` | |
| `#1c1b1b` | `brand-gray-900` | foreground |
| `#5b403e` | `brand-gray-700` | muted-foreground |
| `#8f6f6d` | `brand-gray-400` | |
| `#9e8e8c` | `brand-gray-450` | muted text alternatif |
| `#c9bcba` | `brand-gray-300` | |
| `#e5e2e1` | `brand-gray-100` | border |
| `#fcf9f8` | `brand-gray-50` | card surface |
| `#f7f5f4` | `brand-gray-60` | page background |
| `#f6f3f2` | `brand-gray-60` | hampir identik, pakai gray-60 |
| `#38A169` | `brand-success` | |
| `#C6F6D5` | `brand-success-light` | |
| `#276749` | `brand-success-dark` | |
| `#f0fff4` | `brand-success-soft` | |
| `#D69E2E` | `brand-warning` | |
| `#FEFCBF` | `brand-warning-light` | |
| `#b7791f` | `brand-amber-dark` | |
| `#E53E3E` | `brand-error` | destructive |
| `#FED7D7` | `brand-error-light` | |
| `#9b2c2c` | `brand-error-dark` | |
| `#fff5f5` | `brand-error-soft` | |
| `#3182CE` | `brand-info` | |
| `#BEE3F8` | `brand-info-light` | |
| `#2a6296` | `brand-info-dark` | |
| `#ebf8ff` | `brand-info-soft` | |
| `#DD6B20` | `brand-orange` | |
| `#FEEBC8` | `brand-orange-light` | |
| `#b75415` | `brand-orange-dark` | |
| `#5f3dc4` | `brand-purple` | |
| `#434190` | `brand-purple-dark` | |
| `#e9e3fa` | `brand-purple-light` | |
| `#4a5568` | `brand-slate` | |
| `#f4f0ef` | `brand-surface-warm` | |

## Round 2 — token tambahan (untuk hex berulang yang awalnya tak-terpetikan)

| Hex | Token utility | Catatan |
|-----|---------------|---------|
| `#32201f` | `brand-gray-800` | foreground gelap alternatif |
| `#d5d2d1` | `brand-gray-200` | border muted sedang |
| `#d4c8c7` | `brand-gray-200` | mirip, pakai gray-200 |
| `#d4d1d0` | `brand-gray-200` | mirip, pakai gray-200 |
| `#f5f3f2` | `brand-gray-70` | surface antara gray-60 & gray-50 |
| `#fcfafa` | `brand-gray-55` | surface sangat halus |
| `#fafafa` | `brand-gray-25` | surface netral hampir putih |
| `#faf8f7` | `brand-gray-50` | mirip, pakai gray-50 |
| `#f0eceb` | `brand-gray-80` | surface warm gelap |
| `#fdf2f2` | `brand-red-soft` | hover/soft red |
| `#fff0f0` | `brand-red-soft` | mirip, pakai red-soft |
| `#fdeaea` | `brand-red-soft` | mirip, pakai red-soft |
| `#fdf1f1` | `brand-red-soft` | mirip, pakai red-soft |
| `#fce5e5` | `brand-red-soft` | mirip, pakai red-soft |
| `#fff9f9` | `brand-red-soft` | mirip, pakai red-soft |
| `#FDECEC` | `brand-red-soft` | mirip, pakai red-soft |
| `#d63b45` | `brand-red-accent` | gradient accent red |
| `#9a141d` | `brand-red-dark` | mirip #90121a, pakai red-dark |
| `#FFFBEB` | `brand-warning-soft` | warning bg soft |
| `#F6E05E` | `brand-warning-border` | warning border |
| `#FDE68A` | `brand-warning-light` | mirip, pakai warning-light |
| `#744210` | `brand-warning-dark` | warning text dark |
| `#92400E` | `brand-warning-dark` | mirip, pakai warning-dark |
| `#B45309` | `brand-warning-dark` | mirip, pakai warning-dark |
| `#F59E0B` | `brand-warning` | mirip #D69E2E, pakai warning |
| `#FFC107` | `brand-warning` | mirip, pakai warning |
| `#FEB2B2` | `brand-error-border` | error border light |
| `#FECACA` | `brand-error-border` | mirip, pakai error-border |
| `#9AE6B4` | `brand-success-border` | success border light |
| `#C53030` | `brand-error-dark` | mirip #9b2c2c, pakai error-dark |
| `#EF4444` | `brand-error` | mirip #E53E3E, pakai error |
| `#991B1B` | `brand-error-dark` | mirip, pakai error-dark |
| `#B91C1C` | `brand-error-dark` | mirip, pakai error-dark |
| `#FEF2F2` | `brand-error-soft` | mirip #fff5f5, pakai error-soft |
| `#2F855A` | `brand-success-dark` | mirip #276749, pakai success-dark |
| `#805AD5` | `brand-purple` | mirip #5f3dc4, pakai purple |
| `#5A67D8` | `brand-blue-dark` | mirip #1a3fb0, pakai blue-dark |
| `#718096` | `brand-slate` | mirip #4a5568, pakai slate |
| `#C05621` | `brand-orange` | mirip #DD6B20, pakai orange |
| `#FFFAF0` | `brand-orange-soft` | orange bg soft |

## Round 3 — token tambahan untuk hex mitra (sweep mitra)

| Hex | Token utility | Catatan |
|-----|---------------|---------|
| `#8f131b` | `brand-red-dark` | mirip #90121a, pakai red-dark |
| `#96121a` | `brand-red-dark` | mirip #90121a, pakai red-dark |
| `#975A16` | `brand-amber-dark` | mirip #B7791F, pakai amber-dark |
| `#FEEBD8` | `brand-orange-light` | mirip #FEEBC8, pakai orange-light |
| `#fff8f2` | `brand-orange-soft` | mirip #FFFAF0, pakai orange-soft |
| `#E5F3EB` | `brand-success-soft` | light green badge, mirip #f0fff4 |

## Hex yang masih TIDAK ada token (laporkan, jangan tebak)

Jika menemukan hex di luar tabel di atas, CATAT di laporan: `path:line:hex`. Jangan ganti dengan tebakan.
