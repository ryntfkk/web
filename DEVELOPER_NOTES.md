# POSKO Jasa - Developer Notes & Troubleshooting

Dokumen ini berisi rangkuman arsitektur, testing, dan solusi atas masalah umum (*troubleshooting*) untuk referensi tim developer. Harap baca dokumen ini jika Anda menemui kendala pada lingkungan *production* atau *staging*.

## 1. Arsitektur Infrastruktur

### Frontend (Web)
- **Framework**: Next.js 13+ (App Router)
- **Deployment**: `output: 'export'` (Static HTML/JS/CSS).
- **Hosting**: AWS S3 Bucket (`poskojasa-static-dev`) + AWS CloudFront (`d2qm3dfz28907r.cloudfront.net`).
- **Domain**: `poskojasa.com` di-routing ke CloudFront.

### Backend (API)
- **Framework**: Go (Fiber)
- **Deployment**: Docker Compose di AWS EC2 (`47.130.173.87`).
- **Services**: `caddy` (Reverse Proxy), `api` (Fiber App), `worker`, `postgres`, `redis`.
- **Domain**: `api.poskojasa.com` di-routing ke EC2.

---

## 2. Solusi Masalah Umum (Troubleshooting)

### A. Halaman Web Mengembalikan `403 Forbidden`
**Gejala**: Saat mengakses rute tertentu di `poskojasa.com` (misalnya `/terms`, `/privacy`, `/about`), *browser* menampilkan pesan `403 Forbidden` XML dari S3.
**Penyebab**: Karena frontend di-*host* di S3 sebagai *Static Website*, S3 membutuhkan file fisik (misal: `terms.html`). Jika direktori/file tersebut tidak dibuat di dalam `src/app` Next.js, S3 akan menolak akses (`403 Forbidden`) karena izin *ListBucket* tidak aktif secara default.
**Solusi**: Pastikan Anda membuat *placeholder page* di Next.js (contoh: `src/app/terms/page.tsx`), lalu jalankan *build* dan *deploy* ulang menggunakan skrip `deploy.ps1`.

### B. Halaman Profil Mitra (Partner) Mengembalikan `404 Not Found`
**Gejala**: Mengakses `poskojasa.com/nama-mitra` memicu error API 404.
**Penyebab**: Fungsi `generateStaticParams()` di `src/app/[username]/page.tsx` menentukan *username* apa saja yang halamannya akan di-render saat *build*. Jika *username* tidak ada di fungsi tersebut, halaman tidak akan dibuat. 
**Solusi**: Pastikan `generateStaticParams()` mengambil daftar *username* dari database *production* atau mencantumkan *username* valid secara manual.
**Username Valid untuk Testing**:
- `budiac` (Budi AC Expert)
- `siticom` (Siti Cleaning)
- `jokoplumb` (Joko Plumber)
- `antotech` (Anto Technician)

### C. API Call Menggunakan Fallback Localhost (`http://localhost:8080`)
**Gejala**: *Console browser* menunjukkan `net::ERR_CONNECTION_REFUSED` ke `localhost:8080` meskipun sedang berada di *live site*.
**Penyebab**: Variabel lingkungan `NEXT_PUBLIC_API_URL` tidak terbaca saat *build*, atau *cache* build lama (.next) masih tersimpan.
**Solusi**:
1. Pastikan file `.env.local` memiliki `NEXT_PUBLIC_API_URL=https://api.poskojasa.com/api/v1`.
2. Hapus folder `.next` secara manual.
3. Jalankan `npm run build` dan *deploy*.
*(Catatan: Saat ini file `src/lib/api.ts` sudah ditambahkan fallback default ke URL production agar lebih aman).*

---

## 3. Menjalankan Deployment

### Deployment Backend
Gunakan skrip PowerShell `deploy-backend.ps1` di root proyek. Skrip ini akan mengunggah *source code* backend ke EC2 via SSH dan melakukan *build* ulang Docker container.
**Penting**: Pastikan file `.env` di root sudah berisi kredensial AWS dan Database (`DB_USER=root`, dll).

### Deployment Frontend
Gunakan skrip `deploy.ps1` di dalam folder `web/`. Skrip ini akan menjalankan `next build`, menyingkronkan folder `out/` ke S3, dan melakukan invalidasi *cache* CloudFront.

---
*Dibuat oleh Tim AI Development Posko Jasa*
