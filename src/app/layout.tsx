import type { Metadata, Viewport } from "next";
import { banners, site, siteUrl } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${site.appName} | ${site.name}`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.appName,
  keywords: [...site.keywords],
  authors: [{ name: site.name, url: site.website }],
  creator: site.name,
  publisher: site.name,
  category: "education",
  // Safe default: a page is kept out of search results unless it opts in (see pageMetadata in lib/site.ts).
  // Only the public sign-in and sign-up pages opt in; everything behind a login stays private.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: site.shortName, statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    title: `${site.appName} | ${site.name}`,
    description: site.description,
    url: "/",
    images: [{ url: banners.default, width: 1200, height: 630, alt: `${site.name} enrollment and learning portal`, type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.appName} | ${site.name}`,
    description: site.description,
    images: [{ url: banners.twitter, alt: `${site.name} enrollment and learning portal` }],
  },
  other: { "msapplication-TileColor": site.themeColor },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: site.themeColor,
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
