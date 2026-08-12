import type { Metadata } from "next";
import "./globals.css";
import HeaderWrapper from "@/components/layout/HeaderWrapper";
import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";
import QueryProvider from "@/components/providers/query-provider";
import AuthProvider from "@/components/providers/auth-provider";
import { ChatProvider } from "@/components/providers/chat-provider";
import LegalReconsentGate from "@/components/legal/LegalReconsentGate";
import FloatingChatWrapper from "@/components/ui/floating-chat-wrapper";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Toaster } from "@/components/ui/toast";

// Load Inter font via standard Google Fonts link to bypass Turbopack next/font bug on Amplify
// Dipetakan ke --font-sans lewat @theme di globals.css.

// SE3: metadata root lengkap. `metadataBase` memperbaiki resolusi URL OG relatif;
// `template` membuat judul tiap halaman anak konsisten ("%s | Posko Jasa").
// SE: OG image default 1200×630 (og-default.png) . preview saat di-share
// WhatsApp/Twitter/Facebook. Sebelumnya pakai hero-1.png (rasio tidak standar).
export const metadata: Metadata = {
  metadataBase: new URL("https://poskojasa.com"),
  title: {
    default: "Posko Jasa | Marketplace Jasa Terpercaya",
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
    title: "Posko Jasa | Marketplace Jasa Terpercaya",
    description:
      "Temukan & pesan jasa profesional terpercaya di dekat Anda.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Posko Jasa | Marketplace Jasa Terpercaya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posko Jasa | Marketplace Jasa Terpercaya",
    description:
      "Temukan & pesan jasa profesional terpercaya di dekat Anda.",
    images: ["/og-default.png"],
  },
  alternates: { canonical: "https://poskojasa.com" },
  robots: { index: true, follow: true },
  // Verifikasi kepemilikan domain untuk Google Search Console. Next merender ini
  // menjadi <meta name="google-site-verification" ...> di <head> semua halaman.
  // JANGAN dihapus . Google memeriksa ulang secara berkala; hilang = verifikasi
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
    <html lang="id" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `:root { --font-inter: 'Inter', sans-serif; }` }} />
      </head>
      {/* `pb-16 lg:pb-0` = ruang untuk BottomNav, dan ambangnya WAJIB sama dengan
          ambang BottomNav (`lg:hidden`) serta TopNavbar (`hidden lg:block`).
          Dulu `md:pb-0`, sementara navbar baru muncul di `lg` . di antara keduanya
          (768-1023px: iPad portrait, layar terbagi) tidak ada nav sama sekali dan
          `page-h` (100dvh-4rem) menyisakan 64px kosong di dasar layar. */}
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground pb-16 lg:pb-0">
        <QueryProvider>
          <AuthProvider>
            <ChatProvider>
              <HeaderWrapper />
              <main className="flex-1">
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
              <Footer />
              <BottomNav />
              <FloatingChatWrapper />
              {/* D1: menagih persetujuan versi legal baru ke pengguna lama.
                  Diletakkan di root agar berlaku di seluruh halaman; ia
                  mengecualikan halaman auth & halaman legal itu sendiri. */}
              <LegalReconsentGate />
              <Toaster />
            </ChatProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
