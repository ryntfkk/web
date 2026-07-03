import type { Metadata } from "next";
import "./globals.css";
import TopNavbar from "@/components/layout/TopNavbar";
import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";

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
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground pb-16 md:pb-0">
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
