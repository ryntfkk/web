# PLAN AUDIT KONSISTENSI UI/UX — `web/` (2026-08-15)

> ## ✅ STATUS EKSEKUSI (2026-08-15, sesi lanjutan)
> **Tahap 1–3 §C + fitur §D yang dijawab "Ya" SUDAH DIKERJAKAN** (4 agen paralel; tsc bersih, vitest 29 file/188 test hijau, lint 0 error baru).
> Pengecualian & catatan:
> - **§D no.1 & no.8 = Tidak** (sesuai jawaban) — tidak dikerjakan.
> - **A12 sebagian**: `ui/card.tsx` DIHAPUS (0 importir); adopsi massal `PageContainer` di rute pelanggan DITUNDA (churn besar, nilai per-halaman sudah konsisten-per-nilai) — komponennya dipertahankan.
> - **A15**: shadow di `orders/page.tsx` dibiarkan (nilainya sudah warna brand); CTA `lengkapi-profil` ada di `PhoneVerificationForm` (di luar cakupan batch) — belum dimigrasi ke `Button`.
> - **A18**: penjaga baru `reserved-segments.test.ts` LIVE, dibuktikan merah dulu. Radius kartu auth distandarkan ke `rounded-2xl`.
> - **Fitur #10** ternyata SUDAH ada di `WithdrawalHistoryList` (chip + status server-side) — tanpa perubahan. **Fitur #5** juga sudah ada di `ChatRoomList`; hanya ditambah ambang ≥6 room.
> - **Fitur #12**: backend `?types=` di-deploy (commit `07ba9da`); frontend fallback mulus ke saringan klien selama backend lama.
> - **`jadi-mitra/daftar/page.tsx` TIDAK DISENTUH** — sedang dikerjakan agen AI lain (hapus section etalase layanan pertama); error tsc di file itu milik pekerjaan tsb. `INPUT_CLASS` kini diimpor dari `components/ui/form.ts` (baru).
> - **Semua perubahan `web/` baru live setelah redeploy Amplify** (git push web ditunda sampai pekerjaan agen lain di daftar-page selesai, agar build Amplify tidak merah).
> - Sisa `stash@{0}` di repo web = cadangan insiden git-stash antar-agen; aman di-`git stash drop` setelah dicek.

Audit halaman-per-halaman (78 rute) untuk: navigasi standar, keseragaman layout, konsistensi tema warna, + usulan fitur kecil. Temuan lama yang sudah selesai (audit 2026-08-11) TIDAK diulang di sini.

**Kabar baik dulu:** tema warna **bersih total** — 0 hex liar & 0 kelas Tailwind non-token di seluruh `src/app` (dijaga `layout-conventions.test.ts` + `design-tokens.test.ts`). Ghost token `brand-gray-500/600` sudah hilang. Stepper rusak di `/orders` sudah diganti `StatusBadge`. Penyimpangan yang tersisa hampir semuanya soal **kerangka** (header/container/DataState), bukan warna.

---

## A. TEMUAN LINTAS-HALAMAN (urut prioritas)

### P1 — perilaku salah / elemen tertutup
1. **BottomNav menutup input chat di `/disputes/[id]`.** `/disputes/` tidak ada di daftar hide `BottomNav.tsx:53-68`, jadi nav fixed z-50 menindih kolom pesan di mobile. Plus `DisputeRoomClient.tsx:102` pakai `h-[100dvh]` tanpa body class `chat-room` (pola benar ada di `chat/[room_id]/ChatClient.tsx:18-21`).
2. **Sticky CTA `/jadi-mitra` tertindih BottomNav <640px.** CTA konversi utama landing akuisisi (`jadi-mitra/page.tsx:577`) dan `BottomNav` sama-sama `fixed bottom-0 z-50`; BottomNav menang karena urutan DOM. Tambah `/jadi-mitra` (dan `/jadi-mitra/daftar`) ke hide list.
3. **Header ganda mobile di `/services`.** `ServicesListClient.tsx:33` render `MobilePageHeader`, tapi `/services` tidak ada di `MOBILE_HIDE_PATHS` → TopNavbar ikut render = dua header sticky bertumpuk.
4. **4 halaman mitra render "kosong" saat fetch GAGAL** (bukan error): `mitra/reviews` (error query tak pernah dirender, `reviews/page.tsx:65`), `mitra/portfolio` (`:61-68` abaikan failure), `mitra/dashboard` (`:89-98` buang error → Rp 0 + "belum ada pesanan"), `mitra/verification-status` (`:33-41` → kartu putih kosong tanpa teks). Bungkus dengan `DataState` + retry. Ini persis kelas bug yang `DataState` dibuat untuk cegah — penjaga konvensi TIDAK menegakkan `DataState`, di situ semua deviasi mengumpul.

### P2 — kerusakan UX nyata
5. **`/lengkapi-profil` satu-satunya halaman auth yang masih menampilkan TopNavbar penuh di mobile** (3 saudaranya menyembunyikan). Tambah ke `HeaderWrapper.tsx:114-116`.
6. **`/help` tak punya tombol kembali di mobile**: masuk `MOBILE_HIDE_PATHS` tapi tidak render `MobilePageHeader` — satu-satunya jalan keluar link "Kembali ke Beranda" paling bawah.
7. **`mitra/orders/[id]` cabang loading & not-found tanpa `MitraPageHeader`** (`Client.tsx:337,356`) — judul/back muncul telat; not-found = jalan buntu di mobile. Tiru pola `header` const di `kyc/page.tsx:216`.
8. **`mitra/basecamp` kehilangan bottom nav tanpa alasan**: dikecualikan di `MitraLayoutClient.tsx:106` untuk "action bar fixed" yang tidak pernah dibuat (tombol simpan inline biasa, `basecamp/page.tsx:182`; `pb-28` = ruang kosong mati).
9. **`profile/addresses/edit` mendegradasi data penerima diam-diam**: `new` menyusun `Penerima: nama (hp)` ke `address_detail` (`new/page.tsx:78`), `edit` cuma free-text (`edit/[id]/page.tsx:82`) — nama/HP penerima tak bisa diubah setelah dibuat.
10. **Chip breakpoint salah di `/chat/[room_id]`**: `md:h-[calc(100dvh-4rem)]` di `ChatClient.tsx:53` padahal navbar baru muncul di `lg` → gap 4rem di 768–1023px. Ganti `md:`→`lg:`.
11. **Upload foto gagal di `mitra/services/[id]/edit` ditelan** (`:173-175` cuma `console.error`, halaman tetap navigate) — mitra mengira foto tersimpan.

### P3 — konsistensi sistem desain
12. **`PageContainer` = kode mati di sisi pelanggan** (0 importir; hanya `/mitra` pakai `MitraPageContainer`). Hasil nyata: **6 lebar & 5 skema gutter berbeda** di rute pelanggan (`max-w-lg/2xl/3xl/4xl/6xl/[1200px]`). Adopsi bertahap atau hapus. `ui/card.tsx` juga 0 importir.
13. **Gutter header ≠ body** di `/categories`, `/kategori/[slug]`, `/jasa/…` (header default `px-4`, body `px-3…`/`p-4 sm:p-6 md:p-8`) — judul geser beberapa px dari kartu di bawahnya. Fix: kirim `gutterClass` yang sama.
14. **4 bentuk tombol primer berbeda** — `ui/button.tsx` bagus (59 importir) tapi 0 dipakai di halaman auth/jadi-mitra: login `rounded-full py-4`, daftar-mitra `rounded-md h-12`, forgot-password `rounded-md py-2.5`, shared Button `rounded-md h-[44px]`. Plus **tidak ada shared `Input`** — kandidat terbaik: promosikan `INPUT_CLASS/LABEL_CLASS` dari `jadi-mitra/daftar/page.tsx:47-52` ke `components/ui/`.
15. **Bayangan CTA pakai merah Tailwind, bukan `brand-red`**: `rgba(220,38,38,…)` di login:175, register:130/193/285, jadi-mitra:147, orders:307 — merah glow ≠ merah tombolnya. Buat token `--shadow-brand-red`. (`design-tokens.test.ts` tak bisa menangkap hex di shadow — celah penjaga yang diketahui.)
16. **Chip kategori aktif `/services` pakai `brand-blue`** sementara seluruh keluarga listing pakai `brand-red` untuk state "terpilih".
17. **forgot-password tanpa kartu putih** (form langsung di atas `bg-brand-gray-60`) — beda sendiri dari login/register; 3 skin input berbeda di 4 form auth.
18. **`RESERVED_ROOT_SEGMENTS` rawan lupa di-update** tiap folder root baru (rute baru diam-diam kehilangan TopNavbar mobile). Tambah test: `readdirSync(app/)` ⊆ set.

---

## B. RINGKASAN HALAMAN-PER-HALAMAN

Legenda: ✔ = konsisten penuh (nav+layout+warna). Hanya deviasi yang dicatat; warna bersih di SEMUA halaman.

### Pelanggan — komersial
| Halaman | Status | Catatan |
|---|---|---|
| `/` (home) | ⚠ | Kelas duplikat konflik `px-3 sm:px-4 sm:px-6` (`page.tsx:103`) → bleed hero meleset 8px di sm–md; `RecentlyViewedSection` di-comment (`:120`) — pakai atau hapus importnya |
| `/services` | ⚠ | **Header ganda mobile (A3)**; chip aktif biru (A16) |
| `/services/[id]` | ⚠ | Satu-satunya detail tanpa jalur naik di mobile (breadcrumb `hidden sm:flex`, `:393`); fallback Suspense teks polos padahal punya skeleton (`:1083` vs `:318`) |
| `/search` | ⚠ | Header sticky hand-rolled render di SEMUA breakpoint → bar judul ganda di desktop (`search/page.tsx:92-103`); ganti `MobilePageHeader`. (Perilaku search TIDAK disentuh) |
| `/categories` | ✔− | Coverage state terlengkap; hanya gutter mismatch (A13) |
| `/kategori/[slug]`, `/jasa/[k]/[k]` | ✔− | Kembar rapi; gutter mismatch (A13); grid capped 24 tanpa "lihat semua" → link heading ke `/services?category=` saat `hasMore` |
| `/promos` | ⚠ | Satu-satunya yang header+gutter-nya persis cocok 👍, tapi **tanpa cabang error** — fetch gagal tampil sebagai "Belum Ada Promo" |
| `/cart` | ✔ | Split header mobile/desktop paling bersih; `clearCart` satu tap tanpa konfirmasi/undo |
| `/book/[username]` | ⚠ | Lebar loncat `max-w-lg`→`lg:max-w-5xl` antar step; **mitra 0 layanan = ruang kosong tanpa pesan** (`:960`); tak ada noindex (beda dari `/cart` & `/payment`) |
| `/payment/[order_id]` | ✔− | Rapi; back button tanpa `aria-label`; import `Loader2` mati |
| `/payment/[order_id]/status` | ✔ | Coverage 7 state terbaik se-codebase; fallback Suspense polos; sukses auto-redirect 5 dtk tanpa bisa dihentikan |
| `/[username]` | ✔ | Teladan: satu-satunya yang eksplisit menyamakan `gutterClass`; lebar `max-w-4xl` = lebar ke-6 di luar 4 varian PageContainer |

### Pelanggan — akun & transaksi
| Halaman | Status | Catatan |
|---|---|---|
| `/orders` | ✔− | Stepper rusak SUDAH hilang; branch loading hand-rolled padahal `OrderCardSkeleton` sudah diimpor (`:11`); input cari tanpa tombol ✕ |
| `/orders/[id]` | ✔ | Rujukan mutu; header hand-rolled bisa dilipat ke `MobilePageHeader` (`backHref` + slot `right`) |
| `/orders/[id]/review` | ✔− | `max-w-lg` (lebih sempit dari form lain); CTA sukses ke Beranda, bukan balik ke pesanan; aturan "min 10 karakter" baru muncul sebagai error |
| `/orders/[id]/dispute` | ✔− | Sukses tanpa toast konfirmasi; `dispute_type` hardcode `'OTHER'` |
| `/orders/[id]/additional-fee` | ✔− | Counter `(1/N)` menyiratkan navigasi yang tak ada; tombol potong saldo tak menampilkan saldo |
| `/disputes/[id]` | ❌ | **A1 (nav menutup input)**; header hand-rolled tampil juga di desktop; tak ada link ke pesanan asalnya |
| `/profile` | ✔− | Menu mobile vs tab desktop sudah DRIFT (Favorit/Notifikasi/Hapus Akun beda tempat); tile ringkasan order tak meneruskan status ke `/orders` |
| `/profile/account·security·notifications` | ✔ | Standar `max-w-2xl` terverifikasi; `security` satu-satunya tanpa `backHref="/profile"`; `account` punya div vestigial gap 24px (`:20-22`) |
| `/profile/addresses` (+new/edit) | ⚠ | **A9 (data penerima)**; fetch jalan sebelum auth settle (`:35-38`); cap 5 alamat baru ketahuan di tombol disabled |
| `/profile/favorites` | ✔ | Pengecualian `max-w-3xl` terdokumentasi & cocok; hapus favorit instan tanpa undo |
| `/profile/wallet` (+withdraw/withdrawals/bank-account) | ✔− | withdraw/withdrawals = halaman paling patuh se-scope; `/profile/wallet` sendiri tanpa `MobilePageHeader` (banner hand-rolled tampil juga di desktop); 2 baris filter bisa digabung; form withdraw flash "belum ada rekening" saat fetch rekening in-flight |
| `/chat` (+room) | ✔− | Pola full-bleed benar; **A10 (`md:`→`lg:`)**; inbox tanpa pencarian |
| `/notifications` | ✔ | Paginasi & routing table-driven rapi; filter client-side atas halaman termuat (bisa "0" palsu); fetch sebelum auth settle |
| `/bantuan` (+[id]) | ✔− | Guard di `SupportInbox`, bukan page (fungsional OK); header `SupportChat` hand-rolled (samakan dengan 2 permukaan chat lain) |
| `/help` | ❌ | **A6 (tanpa back mobile)**; kartu "Laporkan Mitra/Layanan" `<div>` mati sementara 2 kartu lain link |
| `/hapus-akun` | ✔ | Patuh; tombol "buka Keamanan" mengarah ke halaman ber-guard untuk pembaca logged-out → beri label "(perlu masuk)" atau `?next=` |

### Mitra
| Halaman | Status | Catatan |
|---|---|---|
| `dashboard` | ⚠ | Hero hand-rolled OK (konsisten wallet/profile), tapi **A4 (error dibuang)**; bel → `/notifications` PELANGGAN = keluar dari shell mitra |
| `orders` | ✔ | **Implementasi rujukan** (header+container+DataState lengkap); search hanya menyaring baris termuat — beri hint |
| `orders/[id]` (+fee) | ⚠ | **A7 (header di branch loading/not-found)**; layar sukses fee tanpa CTA balik; tombol submit fee `brand-orange` sendirian (aksi primer lain merah) |
| `services` (+new/edit) | ✔− | `services` teladan; `new` hand-roll grid foto padahal `edit` pakai `PhotoUploader` yang sama tugasnya; **A11 (upload gagal ditelan di edit)** |
| `schedule` | ✔− | Grid jam mingguan tanpa cabang error — gagal fetch tampil sebagai jam default 08:00–17:00 seolah tersimpan; tak ada guard unsaved-changes |
| `wallet` (+withdraw/withdrawals/bank-account) | ✔− | 3 anak = shell tipis patuh sempurna; `wallet` induk tanpa `MitraPageHeader` & **transaksi tanpa paginasi** (filter tipe client-side atas halaman-1 → "Penarikan" bisa kosong palsu) |
| `reviews` | ❌ | **A4**; draft balasan hilang diam-diam saat pindah halaman |
| `portfolio` | ❌ | **A4**; panah urutkan di bawah fold mobile |
| `documents` | ⚠ | Dua chrome dialog beda di 1 halaman (add pakai `Modal` pelanggan `:360`, delete pakai `MitraModal` `:445`); tanpa DataState |
| `basecamp` | ⚠ | **A8** |
| `profile` | ✔ | Benar menyerap tujuan mobile non-navbar (sesuai aturan); `fetchProfile` tanpa error handling → chip verifikasi hilang ≠ bisa dibedakan; tak ada entry Dompet (hanya dari dashboard) |
| `business` | ✔ | Patuh penuh; skeleton mengganti seluruh halaman termasuk header |
| `account·security·notifications` | ✔ | Kembar identik patuh; `notifications:25` tak meneruskan prop `user` beda dari 2 saudaranya — verifikasi disengaja |
| `verification-status` | ❌ | **A4 (kartu putih kosong)**; satu-satunya header mitra tanpa breadcrumbs; rute REJECTED tak konsisten (`register?mode=reverify` vs gate wallet → halaman ini) — tentukan yang kanonik |
| `kyc` | ✔− | Pola `header` const di semua branch = teladan; KTP/selfie `<input file>` polos tanpa preview padahal bukti kategori pakai `PhotoPickerBox` (KTP buram = tolakan berhari-hari kemudian); submit tanpa `StickyActionBar` |
| `register` | ✔ | Patuh penuh (header+container+StickyActionBar+modal keluar); state wizard murni memori — draft `sessionStorage` murah utk form reverifikasi 6 langkah |
| `bantuan` (+chat) | ✔ | Patuh; `[id]` full-bleed by design |
| `chat` (+room) | ✔ | Pola app-shell benar (allowlist FULL_BLEED); tanpa pencarian room |

### Auth & statis
| Halaman | Status | Catatan |
|---|---|---|
| `/login` | ⚠ | BottomNav TIDAK disembunyikan (tampil di bawah form login); kartu `rounded-[2rem]` di luar skala radius; shadow A15; back arrow `absolute` tanpa parent `relative` |
| `/register` | ⚠ | Tanpa back-to-home mobile (beda dari login); 2 tombol "kembali" beda bentuk dalam 1 file (`:201` vs `:293`); shadow A15 ×3 |
| `/forgot-password` | ⚠ | **A17 (tanpa kartu putih)**; skin input beda dari login |
| `/lengkapi-profil` | ❌ | **A5** — outlier nav auth; kartu = treatment ke-3 |
| `/jadi-mitra` | ⚠ | **A2 (CTA tertindih)**; hex `#80808012` (`:128`) + glow A15 |
| `/jadi-mitra/daftar` | ✔− | Paling konsisten internal (INPUT_CLASS hoisted 👍); TopNavbar+BottomNav dua-duanya tampil di form konversi panjang (beda dari `/book`/`/mitra/register`); error validasi scroll-to-top, field-nya tak difokus |
| `/about` | ✔ | Patuh |
| `/terms` · `/privacy` · `/legal/[slug]` | ✔ | **Trio paling konsisten se-codebase** (shell/container/kartu identik); `backHref="/"` selalu ke home walau datang dari consent register |

---

## C. RENCANA KERJA (urutan eksekusi)

**Tahap 1 — bug elemen tertutup & nav (½ hari, dampak tertinggi):**
A1 (disputes + chat-room class), A2 (jadi-mitra hide BottomNav), A3 (/services ke MOBILE_HIDE_PATHS), A5 (lengkapi-profil), A6 (/help MobilePageHeader), A10 (md→lg), login ke hide list BottomNav.

**Tahap 2 — "gagal ≠ kosong" (1 hari):**
A4 empat halaman mitra pakai DataState; error branch `/promos`; grid jam `schedule`; A11 upload edit; A9 field penerima di edit alamat.

**Tahap 3 — kerangka & token (bertahap, per-PR kecil):**
A7 header branch loading/not-found; A8 basecamp; A12 adopsi `PageContainer` pelanggan (atau hapus + hapus `ui/card.tsx`); A13 gutterClass; A14 shared Input + migrasi 4 form auth ke `ui/button`; A15 token shadow; A16 chip merah; A17 kartu forgot-password; A18 test RESERVED_ROOT_SEGMENTS.

Setiap fix Tahap 3 yang berupa aturan baru → tambahkan penjaga (test merah dulu), sesuai pola yang sudah terbukti: aturan berpenjaga = 0 pelanggaran.

---

## D. USULAN FITUR BARU — jawab **Ya / Tidak** per nomor

Semua kecil, tanpa library baru, tanpa sistem admin baru:

1. **Prefill kode promo**: setelah "Salin" di `/promos`, kode otomatis terisi di kolom promo `/book`? (Tidak)
2. **Undo toast**: hapus favorit / hapus item keranjang / clearCart pakai toast "Urungkan" alih-alih instan permanen? (Ya)
3. **Preselect saldo**: di `/payment`, metode "Saldo" otomatis terpilih bila saldo mencukupi? (Ya)
4. **Tile pesanan pintar**: tile ringkasan di `/profile` meneruskan status → `/orders?status=…` langsung terfilter? (Ya)
5. **Pencarian inbox chat**: satu input filter client-side di atas daftar room (pelanggan & mitra)? (Ya)
6. **Jenis sengketa**: select 4 opsi `dispute_type` menggantikan hardcode `'OTHER'` (mempercepat triase CS; backend sudah menerima)? (Ya=)
7. **Draft wizard mitra**: simpan isian form reverifikasi 6-langkah ke `sessionStorage` agar tak hilang saat keluar? (Ya)
8. **Preview KTP/selfie di KYC**: ganti `<input file>` polos dengan `PhotoPickerBox` ber-preview (cegah tolakan KTP buram)? (Tidak)
9. **Paginasi transaksi dompet mitra**: tombol "Muat lebih banyak" seperti di `mitra/orders`? (Ya)
10. **Chip filter riwayat penarikan** (PENDING/PAID/REJECTED) di halaman withdrawals? (Ya)
11. **CTA "Pesan" sticky di profil publik mitra** (`/[username]`) di mobile? (Ya)
12. **Filter notifikasi server-side** (kirim kategori ke API, hilangkan "0 palsu")? — butuh backend kecil. (Ya)

> Yang TIDAK diusulkan (sesuai aturan yang sudah ditetapkan): navbar/tab baru, rute bantuan ke-5, perubahan perilaku search in-app, sort server-side (E5-sort sudah tercatat ditunda).
