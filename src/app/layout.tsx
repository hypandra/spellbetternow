import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { cookies } from "next/headers";
import "./globals.css";
import SpellingLayoutClient from "@/components/spelling/SpellingLayoutClient";
import { FooterProvider } from "@/contexts/FooterContext";
import { Footer } from "@/components/v3/shared/Footer/Footer";
import { AGE_GATE_COOKIE_NAME, isAge13Plus } from "@/lib/age-gate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const doulosSIL = localFont({
  src: "../../public/fonts/DoulosSIL-Regular.woff2",
  variable: "--font-doulos-sil",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpellBetterNow",
  description: "Adaptive spelling practice with targeted feedback",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const canLoadThirdPartyScripts = isAge13Plus(cookieStore.get(AGE_GATE_COOKIE_NAME)?.value);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${doulosSIL.variable} antialiased`}
        data-spelling-theme="focus"
      >
        <FooterProvider>
          <div className="min-h-screen flex flex-col">
            <SpellingLayoutClient>{children}</SpellingLayoutClient>
            <Footer />
          </div>
        </FooterProvider>
        {canLoadThirdPartyScripts ? (
          <>
            <Script
              src="https://hypandra.com/embed/curiosity-badge.js"
              strategy="lazyOnload"
              type="module"
            />
            {/* @ts-expect-error - Custom element from external script */}
            <curiosity-badge project="spellbetternow" />
          </>
        ) : null}
      </body>
    </html>
  );
}
