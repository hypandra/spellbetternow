import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import SpellingLayoutClient from "@/components/spelling/SpellingLayoutClient";
import { FooterProvider } from "@/contexts/FooterContext";
import { Footer } from "@/components/v3/shared/Footer/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpellBetterNow",
  description: "Adaptive spelling practice with targeted feedback",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        data-spelling-theme="focus"
      >
        <FooterProvider>
          <div className="min-h-screen flex flex-col">
            <SpellingLayoutClient>{children}</SpellingLayoutClient>
            <Footer />
          </div>
        </FooterProvider>
        <Script
          src="https://hypandra.com/embed/curiosity-badge.js"
          strategy="lazyOnload"
          type="module"
        />
        {/* @ts-expect-error - Custom element from external script */}
        <curiosity-badge project="spellbetternow" />
      </body>
    </html>
  );
}
