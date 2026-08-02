import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Pusat Operasional — Toko Agung Lestari",
    description: "Dashboard admin untuk mengelola cabang, stok, transaksi, shift, pegawai, dan laporan Toko Agung Lestari.",
    openGraph: {
      title: "Agung Lestari — Pusat Operasional Toko",
      description: "Stok, transaksi, dan cabang dalam satu kendali.",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "Pusat Operasional Toko Agung Lestari" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Agung Lestari — Pusat Operasional Toko",
      description: "Stok, transaksi, dan cabang dalam satu kendali.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
