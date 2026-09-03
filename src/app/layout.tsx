import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Footer from "@/components/Footer";

const SITE_TITLE = "GomBrick";
const SITE_DESCRIPTION = "Bearbrick database - a collection management platform";

export const metadata: Metadata = {
  metadataBase: new URL("https://gom.favorite.kr"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    // Versioned query string busts browsers' notoriously sticky favicon cache
    icon: "/favicon.ico?v=2",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_TITLE,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-gray-900">
        <AuthProvider>{children}</AuthProvider>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
