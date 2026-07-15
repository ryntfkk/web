import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import HeaderWrapper from "@/components/layout/HeaderWrapper";
import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";
import QueryProvider from "@/components/providers/query-provider";
import AuthProvider from "@/components/providers/auth-provider";
import FloatingChatWrapper from "@/components/ui/floating-chat-wrapper";
import { DevNoticeModal } from "@/components/ui/dev-notice-modal";

// Load Inter font with proper weights
// Dipetakan ke --font-sans lewat @theme di globals.css. Namanya sengaja bukan
// --font-sans agar tidak bertabrakan dengan token Tailwind pada <html>.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Posko Jasa - Marketplace Jasa",
  description: "Platform Marketplace Jasa Terpercaya",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground pb-16 md:pb-0">
        <QueryProvider>
          <AuthProvider>
            <HeaderWrapper />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
            <BottomNav />
            <FloatingChatWrapper />
            <DevNoticeModal />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
