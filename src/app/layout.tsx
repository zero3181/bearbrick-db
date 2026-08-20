import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "GomBrick",
  description: "베어브릭 데이터베이스 - 컬렉션 관리 플랫폼",
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
    <html lang="ko">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Footer />
      </body>
    </html>
  );
}
