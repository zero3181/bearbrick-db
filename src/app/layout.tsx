import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Footer from "@/components/Footer";

const SITE_TITLE = "GomBrick";
const SITE_DESCRIPTION = "Bearbrick database - a collection management platform";

export const metadata: Metadata = {
  metadataBase: new URL("https://gom.favorite.kr"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // Favicon/apple touch icon come from the src/app/icon.png and
  // src/app/apple-icon.png file-convention instead of an explicit `icons`
  // entry here - Next.js serves and links those automatically.
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_TITLE,
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

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body className="antialiased bg-white text-gray-900">
        <NextIntlClientProvider>
          <AuthProvider>{children}</AuthProvider>
          <Footer />
        </NextIntlClientProvider>
        <Analytics />
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
    </html>
  );
}
