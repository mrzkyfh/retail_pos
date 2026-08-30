import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Sora } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Sistem Retail & Grosir — Agung Lestari",
    description: "POS, member/reseller, stok, rak, stock opname, barcode, invoice, dan laporan Toko Agung Lestari.",
    manifest: "/manifest.webmanifest",
    applicationName: "Agung Lestari",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Agung Lestari" },
    icons: {
      icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      title: "Agung Lestari — Sistem Retail & Grosir",
      description: "Retail dan grosir dalam satu sumber stok dan transaksi.",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "Pusat Operasional Toko Agung Lestari" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Agung Lestari — Sistem Retail & Grosir",
      description: "Retail dan grosir dalam satu sumber stok dan transaksi.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${sora.variable} ${plexMono.variable}`}>{children}</body>
    </html>
  );
}
