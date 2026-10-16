import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "@/styles/globals.css";
import { siteConfig } from "@/config/site";
import { Providers } from "@/components/providers";
import { SiteChrome } from "@/components/layout/SiteChrome";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.shortName} | Student Tech Community in Pune`,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  keywords: [
    "Kick To Tech",
    "Pune tech community",
    "tech internship Pune",
    "hackathons Pune",
    "workshops Pune",
    "student developers",
  ],
  authors: [{ name: "KICK To TECH Club" }],
  openGraph: {
    type: "website",
    url: siteConfig.url,
    title: `${siteConfig.shortName} | Student Tech Community in Pune`,
    description: siteConfig.description,
    siteName: "KICK To TECH Club",
    images: [{ url: "/brand/logo.png", width: 1200, height: 630, alt: "Kick To Tech" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.shortName} | Student Tech Community in Pune`,
    description: siteConfig.description,
    creator: "@kicktotech",
  },
  icons: { icon: "/favicon.png", apple: "/brand/logo.png" },
  robots: { index: true, follow: true },
  alternates: { canonical: siteConfig.url },
};

export const viewport: Viewport = {
  themeColor: "#00131b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        {/* Google AdSense Auto Ads — non-AMP integration (loaded once, site-wide). */}
        <Script
          id="google-adsense"
          strategy="afterInteractive"
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1013659886853737"
        />
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
          >
            Skip to content
          </a>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
