"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
];

function shouldHideHeaderOnMobile(pathname: string): boolean {
  // Exact matches
  if (MOBILE_HIDE_PATHS.some((p) => pathname === p)) return true;

  // Prefixed matches (sub-pages)
  if (pathname.startsWith("/orders/")) return true;
  if (pathname.startsWith("/chat/")) return true;
  if (pathname.startsWith("/profile/")) return true;
  if (pathname.startsWith("/payment/")) return true;

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR, render header normally (will be corrected on client)
  if (!mounted) {
    return <TopNavbar />;
  }

  const hideOnMobile = shouldHideHeaderOnMobile(pathname);

  return (
    <div className={hideOnMobile ? "hidden lg:block" : undefined}>
      <TopNavbar />
    </div>
  );
}
