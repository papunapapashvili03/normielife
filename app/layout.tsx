import type { Metadata, Viewport } from "next";
import { Caveat, DM_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

// Handwriting: desk props in the game, marker notes on the landing page.
const caveat = Caveat({
  variable: "--font-hand",
  weight: ["500", "700"],
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NORMIE LIFE",
  description: "BitLife for crypto degenerates. Buy shitcoins, get rugged, work at McDonald's, come back, become a legend.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${dmMono.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg">{children}</body>
    </html>
  );
}
