"use client";

import { usePathname } from "next/navigation";
import TopNavbar from "@/components/layout/TopNavbar";

/**
 * Paths where header should be hidden on mobile (lg: hidden)
 * These are "flow" pages where user is focused on a task
 */
const MOBILE_HIDE_PATHS = [
  "/orders",
  "/chat",
  "/profile",
  "/payment",
  "/notifications",
  "/book",
  "/cart",
  "/search",
  "/promos",
  "/categories",
  "/about",
  "/terms",
  "/privacy",
  "/bantuan",
];

/**
 * Segmen root yang merupakan halaman betulan — BUKAN username mitra.
 *
 * Profil mitra publik ada di rute dinamis `/[username]`, yang menangkap segmen
 * tunggal apa pun di root. Daftar ini yang membedakan `/budi` (profil mitra)
 * dari `/promos` (halaman).
 *
 * WAJIB diperbarui bila ada folder baru di src/app/. Bila terlewat, rute baru
 * itu akan dikira profil mitra dan TopNavbar-nya hilang di mobile.
 */
const RESERVED_ROOT_SEGMENTS = new Set([
  "about",
  "bantuan",
  "book",
  "cart",
  "categories",
  "chat",
  "help",
  "mitra",
  "notifications",
  "orders",
  "payment",
  "privacy",
  "profile",
  "promos",
  "search",
  "services",
  "terms",
  // Route group (auth)
  "login",
  "register",
  "forgot-password",
]);

/**
 * Profil mitra publik: segmen tunggal yang bukan halaman terpesan.
 * `/budi` → true, `/promos` → false, `/orders/123` → false.
 */
function isPartnerProfilePath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 1 && !RESERVED_ROOT_SEGMENTS.has(segments[0]);
}

function shouldHideHeaderOnMobile(pathname: string): boolean {
  // Exact matches
  if (MOBILE_HIDE_PATHS.some((p) => pathname === p)) return true;

  // Profil mitra publik punya header kontekstualnya sendiri (tombol kembali +
  // nama mitra), jadi TopNavbar harus mundur di mobile — kalau tidak, dua
  // header sticky bertumpuk dan memakan 8rem dari viewport.
  if (isPartnerProfilePath(pathname)) return true;

  // Prefixed matches (sub-pages)
  if (pathname.startsWith("/orders/")) return true;
  if (pathname.startsWith("/bantuan/")) return true;
  if (pathname.startsWith("/chat/")) return true;
  if (pathname.startsWith("/profile/")) return true;
  if (pathname.startsWith("/payment/")) return true;
  if (pathname.startsWith("/book/")) return true;
  if (pathname.startsWith("/search/")) return true;

  // Auth pages - header handled by their own layouts
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/register")) return true;
  if (pathname.startsWith("/forgot-password")) return true;

  // Mitra flow pages
  if (pathname.startsWith("/mitra/dashboard")) return true;
  if (pathname.startsWith("/mitra/orders")) return true;
  if (pathname.startsWith("/mitra/profile")) return true;
  if (pathname.startsWith("/mitra/wallet")) return true;
  if (pathname.startsWith("/mitra/bank-account")) return true;
  if (pathname.startsWith("/mitra/services")) return true;
  if (pathname.startsWith("/mitra/schedule")) return true;
  if (pathname.startsWith("/mitra/register")) return true;
  if (pathname.startsWith("/mitra/verification-status")) return true;

  return false;
}

export default function HeaderWrapper() {
  const pathname = usePathname();

  // Area mitra: header pelanggan tidak boleh muncul di breakpoint mana pun
  // (mode mitra punya navigasi sendiri — MitraBottomNav)
  if (pathname.startsWith("/mitra")) {
    return null;
  }

  // Kelas diturunkan murni dari pathname, yang sudah tersedia saat SSR — jadi
  // markup server dan client identik dan tidak ada hydration mismatch.
  // Sebelumnya ada guard `mounted` yang merender <TopNavbar /> tanpa pembungkus
  // saat SSR, sehingga di mobile navbar sempat tampil bersamaan dengan header
  // milik halaman (dua header berkedip) sampai hydration selesai.
  const hideOnMobile = shouldHideHeaderOnMobile(pathname);

  return (
    <div className={hideOnMobile ? "hidden lg:block" : undefined}>
      <TopNavbar />
    </div>
  );
}
