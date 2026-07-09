# Implementation Plan — Audit & Perbaikan Alur Pemesanan

Tanggal audit: 10 Juli 2026
Cakupan: cart, booking (`/book/[username]`), daftar & detail pesanan (`/orders`), pembayaran (`/payment`), tagihan tambahan, ulasan, sengketa, dan detail layanan.

---

## 1. Ringkasan Temuan

### KRITIS

**B-1. Halaman `/cart` tidak ada (404).** `TopNavbar` (desktop & mobile) mengarahkan ikon keranjang ke `/cart`, dan `cartStore` + tombol "Masukan Keranjang" di detail layanan berfungsi — tetapi tidak ada page-nya. Item bisa ditambahkan tapi tidak pernah bisa dilihat atau di-checkout.
✅ Diperbaiki: dibuat `src/app/cart/page.tsx` — item dikelompokkan per mitra, hapus item, kosongkan keranjang, checkout per mitra menuju `/book/{username}?service_ids=a,b,c`.

**B-2. Enum status pesanan salah di `/orders`.** Halaman daftar pesanan memfilter dengan `PENDING / ACCEPTED / PROCESSING`, padahal backend (lihat `status-badge.tsx` & halaman detail) memakai `WAITING_CONFIRMATION / WAITING_PAYMENT / PAID / IN_PROGRESS / WAITING_ADDITIONAL_PAY / WAITING_CUSTOMER_CONFIRM / COMPLETED / CANCELLED / DISPUTED`. Akibatnya tab filter "Menunggu / Sedang Berlangsung" selalu kosong dan hitungannya selalu 0.
✅ Diperbaiki: pemetaan `FILTER_GROUPS` ke enum backend (enum lama tetap didukung sebagai fallback).

**B-3. Mismatch nama field frontend vs backend.** Kontrak backend di `types/api.ts` memakai `address`, `photo_urls`, `payment_expires_at`, `agreed_price`, `discount_amount`, `partner_info`, `items[].name`, `additional_fees[].name/price/fee_type` — sedangkan UI detail pesanan, pembayaran, dan tagihan tambahan membaca `service_address`, `photos`, `payment_expired_at`, `total_amount`, `promo_discount`, `partner`, `items[].service_name`, `additional_fee.item_name/unit_price/type`. Akibatnya: total tampil `Rp 0/NaN`, alamat & foto tidak muncul, countdown pembayaran tidak jalan, kartu mitra kosong.
✅ Diperbaiki: dibuat `src/lib/order-utils.ts` (`normalizeOrder`, `normalizeFee`, `unwrapData`) yang memetakan kedua konvensi field, dipakai di orders list, order detail, payment, additional-fee, dan dispute.

**B-4. Parsing respons `/orders` rapuh.** Kondisi `res.data && Array.isArray(res.data)` gagal bila backend mengirim envelope `{ data: [...], pagination }` → daftar pesanan kosong selamanya.
✅ Diperbaiki: mendukung array langsung maupun envelope bersarang.

**B-5. Halaman detail layanan (publik) memaksa login.** `ServiceDetailClient` memanggil `useRequireAuth()` sehingga pengunjung yang belum login di-redirect ke `/login` hanya untuk melihat layanan.
✅ Diperbaiki: pengecekan auth hanya saat aksi (tambah keranjang / pesan), dengan `?redirect=` agar kembali ke halaman semula setelah login.

### TINGGI

**B-6. Idempotency key tidak berfungsi di booking.** State `idempotencyKey` dibuat per perubahan form, tetapi payload memakai `crypto.randomUUID()` baru setiap submit — retry setelah gagal jaringan bisa membuat pesanan ganda.
✅ Diperbaiki: payload dan header `Idempotency-Key` memakai key yang stabil.

**B-7. Crash `partner.id` saat submit booking.** Jika fetch partner gagal, `partner` masih `null` → TypeError.
✅ Diperbaiki: guard `partner?.id` + pesan error.

**B-8. Submit order memakai `fetch` mentah.** Tanpa mekanisme refresh token 401 milik `fetchAPI` → sesi kedaluwarsa membuat order gagal diam-diam. Upload foto juga tidak memeriksa hasil `PUT` ke S3.
✅ Diperbaiki: semua request lewat `fetchAPI`, hasil upload diverifikasi, error via banner (bukan `alert`).

**B-9. Diskon promo tidak di-reset saat pilihan layanan berubah.** Diskon divalidasi terhadap subtotal lama → total bayar bisa salah (bahkan negatif sebelum `Math.max`).
✅ Diperbaiki: `promoDiscount` di-reset setiap subtotal berubah; kode promo hanya dikirim ke backend jika diskon tervalidasi.

**B-10. Alur Midtrans Snap salah urutan.** SDK dicek *setelah* dipakai; `processing` tidak di-reset saat popup ditutup; pesan error tidak pernah dirender di UI.
✅ Diperbaiki: cek SDK sebelum `snap.pay`, `onClose` me-reset `processing`, banner error ditambahkan; guard saldo dompet sebelum request.

### SEDANG

**B-11. Dispute mengirim FormData ke endpoint JSON.** Tidak konsisten dengan pola API lain (presigned upload + JSON PUT).
✅ Diperbaiki: foto diunggah via presigned URL lalu laporan dikirim sebagai JSON `{ reason, photo_urls }`. *(Perlu konfirmasi kontrak backend — lihat §3.)*

**B-12. Fetch berjalan sebelum auth siap / tanpa guard `orderId`** di detail, review, dispute, additional-fee → request 401 sia-sia saat inisialisasi.
✅ Diperbaiki: efek menunggu `isAuthorized && orderId`.

**B-13. Redirect login tanpa parameter `redirect`** di booking & detail layanan (halaman login sudah mendukungnya).
✅ Diperbaiki.

**B-14. Lain-lain:** pesan error kini memakai `getErrorMessage()` (konsisten dengan envelope backend); item pesanan menghitung `price × quantity`; `baseAmount` tagihan tambahan di-clamp ≥ 0; layanan yang berhasil dipesan otomatis dihapus dari keranjang; tombol "Bayar" ditambahkan di daftar pesanan untuk status `WAITING_PAYMENT`; guard `Array.isArray` pada alamat/layanan; halaman cart menunda render sampai mount (hindari hydration mismatch dari store yang dipersist).

---

## 2. File yang Diubah / Dibuat

| File | Perubahan |
|---|---|
| `src/lib/order-utils.ts` | **BARU** — `normalizeOrder`, `normalizeFee`, `unwrapData` |
| `src/app/cart/page.tsx` | **BARU** — halaman keranjang (B-1) |
| `src/app/book/[username]/BookingClient.tsx` | B-6, B-7, B-8, B-9, B-13, multi-preselect `service_ids`, banner error, bersihkan cart |
| `src/app/orders/page.tsx` | B-2, B-4, tombol Bayar, normalisasi item |
| `src/app/orders/[id]/Client.tsx` | B-3, B-12, `getErrorMessage`, harga × qty |
| `src/app/payment/[order_id]/Client.tsx` | B-3, B-10, banner error, guard saldo |
| `src/app/orders/[id]/additional-fee/Client.tsx` | B-3, B-12, clamp baseAmount |
| `src/app/orders/[id]/dispute/Client.tsx` | B-11, B-12 |
| `src/app/orders/[id]/review/Client.tsx` | B-12, bersihkan import |
| `src/app/services/ServiceDetailClient.tsx` | B-5, B-13 |

---

## 3. Langkah Verifikasi (perlu dijalankan di mesin Anda)

Sandbox saya kehabisan ruang disk sehingga type-check otomatis tidak bisa dijalankan. Jalankan:

```bash
cd web
npx tsc --noEmit     # type-check
npm run lint         # lint
npm run dev          # uji manual
```

Skenario uji manual (urut alur):

1. **Guest** buka detail layanan → tidak boleh redirect ke login; klik "Masukan Keranjang" → redirect login dengan `?redirect=` kembali ke halaman yang sama.
2. **Cart**: tambah ≥2 layanan dari 2 mitra berbeda → ikon navbar menampilkan badge; buka `/cart` → item terkelompok per mitra; hapus item; klik "Pesan" → masuk `/book/{username}` step 2 dengan layanan terpilih.
3. **Booking**: submit tanpa tanggal/waktu/alamat → tombol disabled; validasi promo lalu ubah pilihan layanan → diskon ter-reset; submit sukses → item hilang dari cart, redirect ke detail pesanan.
4. **Orders list**: filter "Menunggu / Sedang Berlangsung / Selesai / Dibatalkan" menghitung dengan benar; pesanan `WAITING_PAYMENT` memunculkan tombol "Bayar".
5. **Detail pesanan**: total, alamat, foto, countdown, dan kartu mitra tampil untuk semua status; aksi Batalkan / Konfirmasi Selesai memperbarui halaman.
6. **Payment**: saldo dompet kurang → metode wallet terkunci; QRIS/VA memunculkan popup Snap; menutup popup mengembalikan tombol "Bayar Sekarang".
7. **Tagihan tambahan / ulasan / sengketa**: setujui-tolak tagihan, kirim ulasan (min. 10 karakter), kirim sengketa dengan foto.

**Perlu dikonfirmasi dengan backend** (Hasil Konfirmasi):

- Endpoint `PUT /orders/{id}/dispute`: apakah menerima JSON `{ reason, photo_urls }` (asumsi perbaikan B-11) atau `multipart/form-data`?
  👉 **HASIL**: Endpoint yang benar adalah `POST /disputes/` dan menerima JSON: `{ "order_id": "...", "dispute_type": "...", "reason": "...", "evidence_urls": [...] }`. Frontend masih keliru (`PUT /orders/{id}/dispute`), butuh perbaikan lebih lanjut.
- Endpoint aksi `PUT /orders/{id}/finish` dan `PUT /orders/{id}/cancel`: nama action path yang benar.
  👉 **HASIL**: Keduanya **BENAR** dan sudah terdaftar di backend (`/:id/finish` & `/:id/cancel`).
- Field respons `POST /promos/validate`: `discount_amount` (asumsi saat ini).
  👉 **HASIL**: Backend mengembalikan object envelope. Nilai diskon berada di `data.summary.discount_amount`. Frontend harus mengakses `summary.discount_amount` dari objek hasil `unwrapData`.
- Apakah `Idempotency-Key` dibaca dari header, body (`idempotency_key`), atau keduanya — saat ini dikirim di keduanya.
  👉 **HASIL**: Backend hanya membaca dari body JSON (`idempotency_key`) pada `CreateOrderRequest`. Mengirim lewat header aman namun tidak digunakan oleh backend.

---

## 4. Rekomendasi Lanjutan (belum dikerjakan)

1. **Satukan tipe Order** — hapus interface `OrderDetail`/`Order` lokal di tiap page dan pakai satu tipe dari `types/api.ts` + `normalizeOrder`, agar mismatch field tidak terulang.
2. **Slot waktu booking dinamis** — jam `08:00–17:00` di-hardcode; sebaiknya diambil dari jadwal kerja mitra (`/partners/{username}/working-hours`).
3. **Polling status pembayaran** — halaman payment mengandalkan tombol "Cek Status" manual; tambahkan polling atau WebSocket agar status VA/QRIS terdeteksi otomatis.
4. **Kuantitas item** — cart & booking selalu `quantity: 1`; tambahkan stepper kuantitas bila backend mendukung.
5. **Konsolidasi guard auth** — beberapa page masih memakai pola campuran (`useAuth`, `useAuthStore`, `useRequireAuth`); standarkan ke `useRequireAuth`.
6. **Ganti `alert()` yang tersisa** di halaman lain (mis. mitra) dengan komponen toast yang sudah ada.
