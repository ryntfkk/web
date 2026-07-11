# Changelog - POSKO Jasa Frontend

Semua perubahan signifikan pada codebase frontend didokumentasikan di sini.

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
