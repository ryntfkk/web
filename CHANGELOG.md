# Changelog - POSKO Jasa Frontend

Semua perubahan signifikan pada codebase frontend didokumentasikan di sini.

---

## [2026-07-19] - Konsistensi UI/UX & Komponen Bersama

### Fixes
- **Crash `profile/favorites`:** `useState` dipanggil setelah early-return (pelanggaran Rules of Hooks) → crash "rendered more hooks" saat status auth berubah. Semua hook kini di atas guard.

### Komponen Baru (single source of truth)
- **`lib/store/toastStore.ts` + `components/ui/toast.tsx`** — Toast global (`useToast()` + `<Toaster/>` di layout). Menggantikan 12 implementasi toast lokal yang diduplikasi.
- **`components/ui/empty-state.tsx`** — `<EmptyState/>` standar (ikon + judul + deskripsi + CTA).
- **`components/ui/skeleton.tsx`** — `<Skeleton/>` standar.
- **`components/ui/stepper.tsx`** — Indikator progres multi-langkah (brand palette).
- **`app/loading.tsx` + `app/not-found.tsx`** — Loading route-level + halaman 404 branded (sebelumnya tidak ada).

### Konsistensi
- **Navigasi:** `MobilePageHeader` diberi slot `right` (aksi opsional) dan diadopsi oleh 8 halaman yang sebelumnya menyalin header sticky sendiri (`favorites`, `notifications`, `security`, `addresses` +new/+edit, `profile/notifications`, `mitra/wallet/withdraw`).
- **Toast:** 12 halaman dimigrasi ke `useToast()`.
- **Radius:** semua `rounded-[4px]` → `rounded-xs` (token 4px), `[12px]`→`xl`, `[10px]`→`lg`.
- **StatusBadge:** status semantik memakai token brand (`bg-brand-warning-light`, `bg-brand-success-light`, dst) — token semantik yang tadinya "mati" kini terpakai.
- **Auth:** `login` dapat tombol back mobile; `register` dapat `Stepper` visual (3 langkah) + warna `neutral-*` diganti palet brand agar seragam dengan `login`.
- **Loading state:** loader teks "Memuat…" diganti spinner/skeleton standar.

### Fitur Baru (frontend-only)
- **Help/FAQ:** halaman `help` yang tadinya placeholder diganti FAQ lengkap — pencarian client-side + accordion + kontak WhatsApp. Konten sesuai config platform (komisi 12%, tarik min Rp50rb/maks Rp10jt/fee Rp3rb).
- **Password strength meter** (`components/ui/password-strength.tsx`) di form `register`.
- **Pencarian pesanan** di `/orders` (filter by no. pesanan / mitra / nama layanan) + empty-state yang sadar-pencarian.

### Cleanup
- **Dark mode dihapus:** blok `.dark` + `@custom-variant dark` di `globals.css` adalah dead code (tanpa toggle/utility `dark:`). Dark mode sebenarnya = proyek terpisah (perlu migrasi hex → token semantik dulu).

### Fitur Lanjutan (frontend-only, tanpa backend)
- **Baru Dilihat** di Beranda — `recentlyViewedStore` (localStorage) merekam layanan yang dibuka; baris horizontal di Home. (`components/home/RecentlyViewedSection.tsx`)
- **Pencarian Terakhir** di halaman Cari — `recentSearchesStore` (localStorage), chip yang bisa diklik ulang / dihapus, muncul saat menjelajah tanpa kata kunci.
- **Pencarian pesanan** — sudah ada di batch sebelumnya; kini juga ada **tab Favorit** (Semua / Layanan / Mitra) di `profile/favorites`.
- **Notifikasi dikelompokkan per tanggal** (Hari Ini / Kemarin / Minggu Ini / Lebih Lama).
- **Chat:** pencarian kini juga mencocokkan isi pesan terakhir (bukan hanya nama).
- **Buku Alamat:** ikon per label (Rumah 🏠 / Kantor 💼 / lainnya 📍).

### Reorder / "Pesan Lagi" (fullstack)
- **Backend baru:** `GET /orders/:id/reorder` (customer-only) → mengembalikan item pesanan lama dengan **harga & ketersediaan terkini** (`available`, `current_price`, `price_changed`), bukan snapshot. Layanan terhapus/nonaktif ditandai `available:false`.
  - `internal/order/dto.go` (`ReorderItemDTO`, `ReorderResponse`), `service.go` (`GetReorder`), `handler.go` (route + handler). Tanpa query SQL baru — reuse `GetServiceByID` (filter `deleted_at`).
- **Frontend:** tombol **Pesan Lagi** di kartu pesanan COMPLETED/CANCELLED → panggil endpoint, tambah item tersedia ke keranjang pada harga terkini, toast jika ada yang tak tersedia / harga berubah, lalu ke `/cart`.
- **Bug fix:** kartu pesanan membaca `order.partner_name` padahal API mengembalikan `order.partner.name` ter-nest → info mitra kini tampil (dengan fallback klien lama).

### Blocked (butuh backend)
- **Layanan terkait** di detail — endpoint `/services` belum punya filter kategori/partner, jadi hasilnya tidak relevan.

### Files Changed
```
NEW  src/lib/store/toastStore.ts
NEW  src/components/ui/{toast,empty-state,skeleton,stepper}.tsx
NEW  src/app/{loading,not-found}.tsx
     src/app/layout.tsx                       # mount <Toaster/>
     src/components/layout/MobilePageHeader.tsx # slot `right`
     src/components/ui/status-badge.tsx        # brand semantic tokens
     src/app/(auth)/{login,register}/page.tsx  # back button, stepper, recolor
     + 8 halaman migrasi header, 12 halaman migrasi toast, codemod radius
```

---

## [2026-07-12] - Update Desain Mobile & Standar UI

### Fitur Baru

#### Header Mobile Conditional Visibility
- **File:** `src/components/layout/HeaderWrapper.tsx` (NEW)
- **Deskripsi:** Header (TopNavbar) sekarang hanya tampil di mobile untuk halaman eksplorasi. Halaman transaction flow (orders, chat, profile, payment) menyembunyikan header untuk pengalaman mobile yang lebih immersive.
- **Halaman dengan Header:** Home, Search, Categories, Services, Cart, Partner Profile, Book, Promos, Info Pages
- **Halaman tanpa Header:** Orders, Chat, Profile, Payment, Notifications, Auth Pages, Mitra Dashboard

#### Compact Forms Mobile
- **File:** `src/app/globals.css`
- **Deskripsi:** Form inputs sekarang lebih compact di mobile dengan padding 10px dan font size 14px
- **Benefit:** UX lebih baik di device mobile, forms tidak terlalu memakan layar

### Perubahan Desain

#### Border Radius Update
- **File:** `src/app/globals.css`
- **Sebelum:** `--radius-md: 2px` (terlalu lancip)
- **Sesudah:** `--radius-md: 8px` (sedikit rounded)
- **Scope:** Semua radius tokens diupdate (sm: 6px, md: 8px, lg: 10px, xl: 12px, 2xl: 16px)
- **Files affected:** 22 file dengan `rounded-[2px]` → `rounded-md`

### Standar Baru

#### Header Implementation Rule
```
❌ SALAH:  import TopNavbar from "@/components/layout/TopNavbar"
✅ BENAR:  import HeaderWrapper from "@/components/layout/HeaderWrapper"
```

#### Border Radius Rule
```
❌ SALAH:  className="rounded-[2px]"
           className="rounded-[20px]"
✅ BENAR:  className="rounded-md"
           className="rounded-lg"
```

### Dokumen Update
- **NEW:** `DESIGN_GUIDELINES.md` - Standar desain lengkap untuk developer
- **UPDATE:** `DEVELOPER_NOTES.md` - Tambahan Section 4: Standar Desain & UI/UX

### Files Changed
```
src/app/globals.css                    # Border radius + compact forms
src/app/layout.tsx                     # Use HeaderWrapper
src/components/layout/HeaderWrapper.tsx  # NEW - conditional header logic
src/components/layout/TopNavbar.tsx   # Update hardcoded rounded values

# Files dengan rounded-[2px] → rounded-md:
src/components/partner/ProfileHeader.tsx
src/components/search/SearchContent.tsx
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/service-card.tsx
src/components/service/ScheduleView.tsx
src/app/[username]/PartnerProfileClient.tsx
src/app/about/page.tsx
src/app/categories/page.tsx
src/app/help/page.tsx
src/app/orders/page.tsx
src/app/terms/page.tsx
src/app/privacy/page.tsx
src/app/promos/page.tsx
src/app/cart/page.tsx
src/app/search/page.tsx
src/app/(auth)/login/page.tsx
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/register/page.tsx
src/app/mitra/profile/page.tsx
src/app/mitra/orders/page.tsx
src/app/mitra/dashboard/page.tsx
```

---

## Template

```
## [YYYY-MM-DD] - Deskripsi Singkat

### Fitur Baru
- Deskripsi fitur

### Perubahan
- Apa yang berubah

### Fixes
- Bug yang diperbaiki
```
