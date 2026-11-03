import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Instrument_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Bodoni for fragrance names and headings, like the label on a bottle.
const bodoni = Bodoni_Moda({
  variable: "--font-bodoni-moda",
  subsets: ["latin"],
  axes: ["opsz"],
});

// Instrument Sans for everything you read or press.
const instrument = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scentbook",
  description: "Letterboxd for fragrance. Log your collection, keep a wear diary, and rank what you've tried.",
};

export const viewport: Viewport = {
  themeColor: "#191420",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bodoni.variable} ${instrument.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
        <footer className="mt-auto border-t border-line">
          <p className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted sm:px-6">
            Fragrance data and bottle images from the Fragella API, plus entries curated by hand.
          </p>
        </footer>
      </body>
    </html>
  );
}
