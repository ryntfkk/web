# POSKO Jasa - Design Guidelines & UI/UX Standards

Dokumen ini berisi standar desain UI/UX, aturan komponen, dan guideline untuk pengembangan frontend. Semua developer wajib mengikuti standar ini untuk menjaga konsistensi antarmuka.

> [!NOTE]
> Dokumen ini adalah bagian dari SDD (System Design Document) - Section 4: User Interface Design.

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Navigation Layout](#2-navigation-layout)
3. [Border Radius Standards](#3-border-radius-standards)
4. [Form Design](#4-form-design)
5. [Responsive Breakpoints](#5-responsive-breakpoints)
6. [Color Palette](#6-color-palette)
7. [Typography](#7-typography)
8. [Spacing Tokens](#8-spacing-tokens)
9. [Component Guidelines](#9-component-guidelines)
10. [Aksesibilitas (wajib)](#10-aksesibilitas-wajib)

---

## 1. Design System

### 1.1 Tech Stack
- **Framework**: Next.js 13+ (App Router)
- **Styling**: Tailwind CSS + CSS Variables
- **Component Library**: Custom components (shadcn/ui base)
- **Icons**: Lucide React
- **Font**: Inter (Google Fonts)

### 1.2 Global CSS Structure
Semua konfigurasi desain utama berada di `src/app/globals.css`:

```css
@theme inline {
  /* Border Radius - Lihat Section 3 */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  
  /* Brand Colors */
  --color-brand-red: #b51822;
  --color-brand-red-dark: #90121a;
  /* ... */
}
```

---

## 2. Navigation Layout

### 2.1 Header (TopNavbar)

#### Aturan Tampilan Mobile vs Desktop

**Desktop (≥1024px / lg):** Header selalu tampil di semua halaman.

**Mobile (<1024px):** Header hanya tampil di halaman **eksplorasi**.
Daftar otoritatifnya ada di `MOBILE_HIDE_PATHS` + `RESERVED_ROOT_SEGMENTS`
(`src/components/layout/HeaderWrapper.tsx`) . tabel di bawah hanya ringkasan
dan **bukan** sumber kebenaran. Rute baru di root WAJIB didaftarkan di sana;
kalau terlewat, ia dikira profil mitra dan header-nya hilang di mobile.

| Tampilkan Header | Sembunyikan Header |
|------------------|-------------------|
| `/` (Home) | `/orders` |
| `/search` | `/chat` |
| `/categories` | `/profile` |
| `/services` | `/payment` |
| `/cart` | `/notifications` |
| `/[username]` (Mitra) | `/login` |
| `/book/[username]` | `/register` |
| `/promos` | `/forgot-password` |
| `/about`, `/help`, `/privacy`, `/terms` | `/mitra/*` |
| `/services/[id]` | `/jasa/*`, `/kategori/*`, `/legal/*` |
| | `/bantuan`, `/hapus-akun`, `/disputes/*` |

#### Implementasi
Gunakan komponen `HeaderWrapper` di `src/components/layout/HeaderWrapper.tsx`:

```tsx
import HeaderWrapper from "@/components/layout/HeaderWrapper";

// Di layout.tsx
<body>
  <HeaderWrapper />  // Otomatis handle visibility
  <main>{children}</main>
  <BottomNav />
</body>
```

> [!IMPORTANT]
> **Jangan** import `TopNavbar` langsung ke page. Selalu gunakan `HeaderWrapper` agar logic conditional visibility berfungsi.

### 2.2 Bottom Navigation (BottomNav)
- Tampil **di bawah `lg`** (`lg:hidden`), tempat TopNavbar mengambil alih
- Posisi: `fixed bottom-0`, `z-50`

> [!CAUTION]
> **Ambangnya WAJIB `lg`, bukan `md`.** Tiga berkas harus sepakat:
> `BottomNav` (`lg:hidden`), `HeaderWrapper` (`hidden lg:block`), dan
> `<body>` (`pb-16 lg:pb-0`). Saat BottomNav sempat memakai `md:hidden`
> sementara TopNavbar tetap `lg`, rentang **768-1023px** (iPad portrait,
> Surface, jendela desktop yang di-snap setengah) kehilangan SELURUH navigasi
> global . yang bawah sudah pergi, yang atas belum datang.
> Dijaga otomatis oleh `src/components/layout/nav-breakpoint.test.ts`.

### 2.3 Mobile-First Layout Pattern
Ruang bottom-nav diberikan SEKALI di `<body>` (`src/app/layout.tsx`):
```tsx
<body className="… pb-16 lg:pb-0">
```
Halaman **tidak** perlu menambahkannya lagi . shell mitra sempat melakukannya
dan hasilnya padding ganda 128px di bawah setiap halaman mitra.

---

## 3. Border Radius Standards

### 3.1 Global Token Values
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Tags, badges, small elements |
| `--radius-md` | 8px | Buttons, inputs, small cards |
| `--radius-lg` | 10px | Cards, modals, panels |
| `--radius-xl` | 12px | Large cards, containers |
| `--radius-2xl` | 16px | Modal dialogs, overlays |
| `--radius-full` | 9999px | Pills, avatars (circular) |

### 3.2 Tailwind Classes
```css
/* Di globals.css @theme inline */
rounded-sm   → var(--radius-sm)  → 6px
rounded-md   → var(--radius-md)  → 8px
rounded-lg   → var(--radius-lg)  → 10px
rounded-xl   → var(--radius-xl)  → 12px
rounded-2xl  → var(--radius-2xl) → 16px
rounded-full → 9999px
```

### 3.3 Usage Guidelines

#### ✅ BENAR
```tsx
<button className="rounded-md">Submit</button>
<input className="rounded-md border" />
<div className="rounded-lg bg-white shadow">Card</div>
```

#### ❌ SALAH
```tsx
<button className="rounded-[2px]">Submit</button>  {/* Terlalu lancip */}
<div className="rounded-[20px]">Card</div>  {/* Terlalu bulat */}
```

> [!CAUTION]
> **Jangan pernah** gunakan `rounded-[2px]` atau nilai pixel hardcoded. Selalu gunakan token yang sudah didefinisikan.

### 3.4 Component-Specific Rules
| Component | Border Radius |
|-----------|--------------|
| Buttons | `rounded-md` |
| Inputs | `rounded-md` |
| Cards | `rounded-lg` |
| Modals | `rounded-xl` atau `rounded-2xl` |
| Badges | `rounded-full` (pills) atau `rounded-sm` |
| Avatars | `rounded-full` |
| Dropdowns | `rounded-lg` |

---

## 4. Form Design

### 4.1 Mobile-Optimized Compact Forms

#### Global Compact Styles (Mobile <768px)
Di `globals.css` sudah ada style khusus untuk mobile:

```css
@media (max-width: 767px) {
  input, textarea, select {
    padding-top: 0.625rem !important;  /* 10px */
    padding-bottom: 0.625rem !important;
    /* 16px, BUKAN 14px. Font < 16px pada input memicu auto-zoom iOS Safari
       saat field difokus . layar melompat dan pengguna kehilangan konteks.
       Jangan "dirapikan" kembali ke 0.875rem. */
    font-size: 1rem !important;
  }
  
  button {
    min-height: 40px !important;
  }
}
```

#### 4.2 Input Field Guidelines

**Struktur:**
```tsx
<div className="relative">
  <Icon className="absolute left-3 top-1/2 -translate-y-1/2" />
  <input 
    type="text"
    className="w-full p-3 pl-10 border border-[#e5e2e1] rounded-md text-sm focus:outline-none focus:border-[#b51822]"
  />
</div>
```

**States:**
| State | Style |
|-------|-------|
| Default | `border-[#e5e2e1]` |
| Focus | `border-[#b51822] focus:ring-1 focus:ring-[#b51822]` |
| Error | `border-[#E53E3E] bg-[#FFF5F5]` |
| Disabled | `bg-[#f6f3f2] text-[#8f6f6d]` |

#### 4.3 Label Guidelines
```tsx
<label className="block text-sm font-semibold text-[#1c1b1b] mb-2">
  Label Text
</label>
```

- Font weight: `semibold` (600)
- Font size: `text-sm` (14px)
- Margin bottom: `mb-2` (8px)

### 4.4 Form Layout Spacing
| Element | Mobile | Desktop |
|---------|--------|---------|
| Input padding | 10px | 12px |
| Input height | auto | auto |
| Form group margin | 14px | 16px |
| Section spacing | 24px | 32px |

### 4.5 Densitas mode mitra (compact)

Halaman mode mitra (`/mitra/*`) dipakai dari HP dan memakai **skala compact**
sebagai default (kartu `p-3 lg:p-4/5`, antar-field `space-y-3`, label `mb-1.5`,
list-item `p-3` + ikon `w-9 h-9`, banner via `MitraInfoBanner`). Metrik dashboard
memakai `MitraStatStrip`, bukan grid kartu. **Sumber kebenaran & alasannya ada di
`DEVELOPER_NOTES.md` §7a » "Densitas mobile (skala compact)"** . dokumen itu lebih
baru dan menang bila berbeda dari tabel di atas. Font input mobile tetap 16px.

---

## 5. Responsive Breakpoints

### 5.1 Tailwind Breakpoints
| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | **Desktop** (header visibility) |
| `xl` | 1280px | Large desktops |
| `2xl` | 1536px | Extra large |

### 5.2 Common Responsive Patterns

#### Header Visibility
```tsx
// Mobile: hidden, Desktop: visible
<div className="hidden lg:block">
  <DesktopOnly />
</div>
```

#### Grid Columns
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 col mobile, 2 cols tablet, 3 cols desktop */}
</div>
```

#### Padding Adjustments
```tsx
<div className="px-4 md:px-6 lg:px-8">
  {/* Compact padding mobile, generous desktop */}
</div>
```

---

## 6. Color Palette

### 6.1 Brand Colors
| Name | Hex | Usage |
|------|-----|-------|
| `brand-red` | `#b51822` | Primary CTA, highlights |
| `brand-red-dark` | `#90121a` | Hover states |
| `brand-red-light` | `#f0eded` | Light backgrounds |
| `brand-gray-900` | `#1c1b1b` | Teks utama |
| `brand-gray-700` | `#5b403e` | Teks sekunder |
| `brand-gray-450` | `#876967` | Teks muted (4,95:1 putih / 4,55:1 latar halaman) |
| `brand-gray-400` | `#7d5f5d` | Teks muted lebih gelap (5,73 / 5,27) |
| `brand-gray-100` | `#e5e2e1` | Border, pemisah |
| `brand-gray-60` | `#f7f5f4` | **Latar halaman** |
| `brand-gray-50` | `#fcf9f8` | Latar kartu/navbar |
| `brand-blue` | `#1e4fd6` | Link, tab aktif, **ring fokus** |

> Daftar lengkapnya (termasuk seluruh varian `*-soft`, `*-dark`, `*-border`)
> ada di `@theme` pada `src/app/globals.css` . itulah sumber kebenarannya.

### 6.2 Semantic Colors
| Name | Hex | Usage |
|------|-----|-------|
| `brand-success` | `#38A169` | Success states |
| `brand-error` | `#E53E3E` | Error states |
| `brand-warning` | `#D69E2E` | Warning states |
| `brand-info` | `#3182CE` | Info states |

### 6.3 Tailwind Classes

> [!CAUTION]
> **DILARANG menulis hex di `className`.** Bagian ini dulu justru MENGANJURKAN
> `text-[#b51822]`; seluruh `src` sudah dibersihkan dari hex dan aturannya kini
> kebalikannya. Warna baru WAJIB lewat token `@theme` di `globals.css` dulu.
> Palet Tailwind mentah (`bg-gray-100`, `text-red-500`, …) juga dilarang .
> keduanya dijaga `src/app/layout-conventions.test.ts`.

```tsx
// Teks
text-brand-gray-900   // Teks utama
text-brand-gray-700   // Teks sekunder
text-brand-gray-450   // Teks muted (sudah lolos WCAG AA)
text-brand-red        // Aksen / CTA

// Latar
bg-brand-gray-60      // Latar halaman
bg-white              // Kartu
bg-brand-red          // CTA utama

// Border
border-brand-gray-100 // Border default
border-brand-red      // Border aktif
```

**Token yang tidak terdefinisi tidak menghasilkan warna apa pun** . Tailwind
diam saja, dan elemennya mewarisi warna induk. `brand-gray-500`/`-600` sempat
dipakai 14 kali tanpa pernah ada. Dijaga `src/app/design-tokens.test.ts`
(membandingkan DEFINISI di `globals.css` dengan PEMAKAIAN di seluruh `src`).

### 6.4 Kontras (WCAG AA)

Teks normal wajib ≥ **4,5:1** terhadap latarnya . dan latar halaman di
aplikasi ini `bg-brand-gray-60` (#f7f5f4), bukan putih, jadi itulah yang
dihitung. `brand-gray-450` & `brand-gray-400` sempat gagal (3,13:1 dan 4,14:1)
di 480 tempat sekaligus; nilainya sudah digelapkan. **Jangan mencerahkannya
tanpa menghitung ulang rasionya.**

---

## 7. Typography

### 7.1 Font Stack
- **Primary**: Inter (Google Fonts)
- **Fallback**: system-ui, -apple-system, sans-serif

### 7.2 Font Weights
| Weight | Value | Usage |
|--------|-------|-------|
| Normal | 400 | Body text |
| Medium | 500 | Secondary emphasis |
| Semibold | 600 | Labels, emphasis |
| Bold | 700 | Headings, CTAs |

### 7.3 Font Sizes
| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Captions, timestamps |
| `text-sm` | 14px | Body text, labels |
| `text-base` | 16px | Default |
| `text-lg` | 18px | Subheadings |
| `text-xl` | 20px | Section titles |
| `text-2xl` | 24px | Page titles |
| `text-3xl` | 30px | Hero titles |

---

## 8. Spacing Tokens

### 8.1 CSS Custom Properties
```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
```

### 8.2 Tailwind Equivalents
| Token | Tailwind | Pixels |
|-------|----------|--------|
| `space-1` | `m-1`, `p-1` | 4px |
| `space-2` | `m-2`, `p-2` | 8px |
| `space-3` | `m-3`, `p-3` | 12px |
| `space-4` | `m-4`, `p-4` | 16px |
| `space-6` | `m-6`, `p-6` | 24px |
| `space-8` | `m-8`, `p-8` | 32px |

---

## 9. Component Guidelines

### 9.1 Button Variants
Sumber kebenarannya `src/components/ui/button.tsx` . tabel ini ringkasannya.

| Variant | Style | Usage |
|---------|-------|-------|
| `primary` | `bg-brand-red text-white hover:bg-brand-red-dark` | CTA utama |
| `secondary` | `bg-transparent text-brand-red border-brand-red` | Aksi sekunder (outline merah) |
| `outline` | `bg-transparent text-brand-gray-700 border-brand-gray-100` | Aksi netral |
| `ghost` | `bg-transparent text-brand-red hover:bg-brand-red-light` | Aksi tersier |
| `danger` | `bg-brand-error text-white hover:bg-brand-error-dark` | Aksi destruktif |
| `link` | `bg-transparent text-brand-red hover:underline` | Tautan dalam teks |

State `isLoading` menimpa isi tombol dengan spinner **tanpa mengganti
children** (children jadi `invisible`), supaya lebar tombol tidak berubah dan
tombol IKON persegi tidak kebobolan teks.

### 9.2 Card Component
```tsx
<div className="bg-white rounded-lg border border-[#e5e2e1] p-4">
  {/* Card content */}
</div>
```

### 9.3 Badge Component
```tsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
  Badge Text
</span>
```

### 9.4 Avatar Component
```tsx
<div className="w-10 h-10 rounded-full border border-[#e5e2e1] overflow-hidden">
  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
</div>
```

---

## 10. Aksesibilitas (wajib)

Aturan berikut lahir dari cacat nyata, bukan teori . masing-masing pernah
membuat sebagian pengguna benar-benar buntu.

| Aturan | Kenapa |
|---|---|
| Radio/checkbox tersembunyi pakai **`sr-only`**, JANGAN `hidden` | `hidden` = `display:none` = keluar dari urutan tab DAN pohon aksesibilitas. Ketiga metode pembayaran sempat begini, sehingga pembayaran mustahil diselesaikan tanpa tetikus. Dijaga `a11y-conventions.test.ts`. |
| Kontrol bergaya WAJIB punya indikator fokus tampak | `focus-within:ring-2 focus-within:ring-brand-blue` pada `<label>` pembungkus . bekerja terlepas dari urutan DOM. |
| Elemen yang bisa diklik = `<button>`/`<Link>`, bukan `<div onClick>` | `<div>` tidak bisa difokus & tidak merespons Enter/Space. |
| Isi `<button>` hanya phrasing content | `<h3>`/`<p>` di dalam `<button>` = HTML tak valid; pakai `<span className="block">`. |
| Satu halaman satu `<h1>` | `MobilePageHeader` merender `<h1>` secara default . halaman yang punya H1 sendiri WAJIB mengoper `titleAs="p"`. Dijaga `a11y-conventions.test.ts`. |
| Status tidak pernah hanya warna | Selalu ikon + teks (lihat `StatusBadge`). |
| Dialog wajib menahan fokus | `ui/modal` & `MitraModal` sudah: Escape, focus trap dua arah, kembalikan fokus ke pemicu, `aria-labelledby`. |

---

## Appendix A: Common Patterns

### A.1 Page Structure Pattern
```tsx
export default function Page() {
  return (
    <div className="page-h bg-[#f7f5f4] pb-24 lg:pb-0">
      {/* Page Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-16 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-base font-bold">Page Title</h1>
        </div>
      </div>
      
      {/* Page Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Content here */}
      </div>
    </div>
  );
}
```

### A.2 Mobile-Optimized List Item
```tsx
<div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-[#e5e2e1]">
  <Image src={image} alt={title} className="w-16 h-16 rounded-md" />
  <div className="flex-1 min-w-0">
    <h3 className="font-semibold text-[#1c1b1b] truncate">{title}</h3>
    <p className="text-sm text-[#5b403e]">{subtitle}</p>
  </div>
</div>
```

---

## Appendix B: DO's and DON'Ts

### ✅ DO's
- Gunakan `HeaderWrapper` untuk navigasi
- Gunakan token CSS untuk border radius
- Buat form compact untuk mobile
- Ikuti responsive breakpoint yang sudah ada
- Konsisten dengan color palette brand

### ❌ DON'Ts
- Jangan import `TopNavbar` langsung
- Jangan gunakan `rounded-[2px]` atau pixel hardcoded
- Jangan buat form inputs terlalu besar di mobile
- Jangan hardcode warna, gunakan CSS variables

---

*Document Version: 2.0*
*Last Updated: 2026-08-11 . diselaraskan dengan kode setelah audit UI/UX
(`AUDIT-UIUX-WEB-2026-08.md`). Bagian yang dulu bertentangan dengan kode .
ambang bottom nav, ukuran font input mobile, varian tombol, dan anjuran memakai
hex mentah . sudah diperbaiki.*
*Aturan yang punya penjaga otomatis ditandai di tempatnya; ubah TEST-nya bila
aturannya memang perlu berubah, jangan akali kelasnya.*
