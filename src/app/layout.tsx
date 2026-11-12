import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

// Schriften werden beim Build heruntergeladen und von der eigenen Domain
// ausgeliefert — Besucher stellen keine Anfrage an Google.
const body = Inter({ subsets: ["latin"], display: "swap", variable: "--font-body" });
const heading = Source_Serif_4({ subsets: ["latin"], display: "swap", variable: "--font-heading" });

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: site.manifestTheme,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
