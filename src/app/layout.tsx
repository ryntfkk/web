import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import HeaderWrapper from "@/components/layout/HeaderWrapper";
import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";
import QueryProvider from "@/components/providers/query-provider";
import AuthProvider from "@/components/providers/auth-provider";
import { ChatProvider } from "@/components/providers/chat-provider";
import FloatingChatWrapper from "@/components/ui/floating-chat-wrapper";
import { DevNoticeModal } from "@/components/ui/dev-notice-modal";
import { Toaster } from "@/components/ui/toast";

// Load Inter font with proper weights
// Dipetakan ke --font-sans lewat @theme di globals.css. Namanya sengaja bukan
// --font-sans agar tidak bertabrakan dengan token Tailwind pada <html>.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

// SE3: metadata root lengkap. `metadataBase` memperbaiki resolusi URL OG relatif;
// `template` membuat judul tiap halaman anak konsisten ("%s | Posko Jasa").
// TODO(SE3): ganti /images/hero-1.png dengan aset OG khusus 1200×630 (og-default.png).
export const metadata: Metadata = {
  metadataBase: new URL("https://poskojasa.com"),
  title: {
    default: "Posko Jasa — Marketplace Jasa Terpercaya",
    template: "%s | Posko Jasa",
  },
  description:
    "Temukan & pesan jasa profesional terpercaya di dekat Anda. AC, kebersihan, perbaikan, dan lainnya.",
  keywords: [
    "jasa",
    "marketplace jasa",
    "tukang",
    "service AC",
    "jasa kebersihan",
    "posko jasa",
  ],
  applicationName: "Posko Jasa",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://poskojasa.com",
    siteName: "Posko Jasa",
    title: "Posko Jasa — Marketplace Jasa Terpercaya",
    description:
      "Temukan & pesan jasa profesional terpercaya di dekat Anda.",
    images: [
      {
        url: "/images/hero-1.png",
        width: 1200,
        height: 630,
        alt: "Posko Jasa",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posko Jasa — Marketplace Jasa Terpercaya",
    description:
      "Temukan & pesan jasa profesional terpercaya di dekat Anda.",
    images: ["/images/hero-1.png"],
  },
  alternates: { canonical: "https://poskojasa.com" },
  robots: { index: true, follow: true },
  // Verifikasi kepemilikan domain untuk Google Search Console. Next merender ini
  // menjadi <meta name="google-site-verification" ...> di <head> semua halaman.
  // JANGAN dihapus — Google memeriksa ulang secara berkala; hilang = verifikasi
  // dicabut dan data Search Console berhenti.
  verification: {
    google: "TvH5t6zCpwUyYoV6ClSZTo7d0qop9LM-m1Dl9mffFLc",
  },
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
            <ChatProvider>
              <HeaderWrapper />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
              <BottomNav />
              <FloatingChatWrapper />
              <DevNoticeModal />
              <Toaster />
            </ChatProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
