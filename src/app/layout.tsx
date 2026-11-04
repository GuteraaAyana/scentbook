import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { pageContainer } from "@/lib/ui";
import "./globals.css";

// One family for everything: Manrope is compact and clear at small sizes
// (dense poster rows) and confident bold at large ones.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scentbook",
  description: "Letterboxd for fragrance. Log your collection, keep a wear diary, and rank what you've tried.",
};

export const viewport: Viewport = {
  themeColor: "#0d1014",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
        <footer className="mt-auto bg-chrome">
          <div className={`${pageContainer} flex flex-wrap justify-between gap-4 py-8 text-sm text-muted`}>
            <p>Fragrance data and bottle images from the Fragella API, plus entries curated by hand.</p>
            <Link href="/people" className="font-bold hover:text-foreground">
              People
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
