"use client";

import { usePathname } from 'next/navigation';
import TopNavbar from '@/components/layout/TopNavbar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import FloatingChatWrapper from '@/components/ui/floating-chat-wrapper';

// Route auth tampil full-screen tanpa navbar/footer (UI-UX §4.1 — mockup Login)
const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = AUTH_ROUTES.some((r) => pathname?.startsWith(r));

  if (hideChrome) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <TopNavbar />
      {/* pb-16 memberi ruang BottomNav (fixed) di mobile */}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
      <FloatingChatWrapper />
    </>
  );
}
