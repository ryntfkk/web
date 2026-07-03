import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TopNavbar from "@/components/layout/TopNavbar";
import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";

// Load Inter font with proper weights
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Posko Jasa - Marketplace Jasa",
  description: "Platform Marketplace Jasa Terpercaya - Pesan jasa reparasi AC, kebersihan, kelistrikan, dan kebutuhan rumah lainnya dengan mudah dan aman.",
  keywords: ["marketplace jasa", "reparasi AC", "jasa kebersihan", "tukang ledeng", "tukang listrik"],
  authors: [{ name: "Posko Jasa" }],
  openGraph: {
    title: "Posko Jasa - Marketplace Jasa",
    description: "Platform Marketplace Jasa Terpercaya",
    type: "website",
    locale: "id_ID",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-[#1c1b1b] font-sans">
        <TopNavbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
