import type { Metadata, Viewport } from "next";
import { Inter, Sora, DM_Sans, JetBrains_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rareimagery.net";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RareImagery X Marketplace",
    template: "%s | RareImagery",
  },
  description:
    "Creator-driven storefronts powered by X profiles, Grok AI analytics, and seamless commerce.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "RareImagery",
    title: "RareImagery X Marketplace",
    description:
      "Creator-driven storefronts powered by X profiles, Grok AI analytics, and seamless commerce.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RareImagery X Marketplace",
    description:
      "Creator-driven storefronts powered by X profiles, Grok AI analytics, and seamless commerce.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${sora.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
