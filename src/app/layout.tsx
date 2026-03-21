import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "住宅ニュースまとめ | 住宅業界・ハウスメーカー最新情報",
    template: "%s | 住宅ニュースまとめ",
  },
  description: "住宅業界の最新ニュースとハウスメーカー情報をまとめてお届け。大和ハウス、積水ハウス、一条工務店など大手ハウスメーカーの動向を毎日更新。",
  metadataBase: new URL("https://jutaku-news.jp"),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "住宅ニュースまとめ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={notoSansJP.variable}>
      <body className="font-sans antialiased bg-gray-50 text-gray-900 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
