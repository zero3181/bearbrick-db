import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "GomBrick",
  description: "Bearbrick database - a collection management platform",
  icons: {
    // Versioned query string busts browsers' notoriously sticky favicon cache
    icon: "/favicon.ico?v=2",
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
      </body>
    </html>
  );
}
