import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Vellum - Craft Beautiful Websites",
  description:
    "A portfolio-grade CMS that empowers you to build and publish beautiful websites through an intuitive visual page builder.",
  openGraph: {
    title: "Vellum - Craft Beautiful Websites",
    description:
      "Build and publish beautiful websites through an intuitive visual page builder. No coding required.",
    siteName: "Vellum",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vellum - Visual Page Builder & CMS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vellum - Craft Beautiful Websites",
    description:
      "Build and publish beautiful websites through an intuitive visual page builder.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF9F7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable}`}>
        {children}
      </body>
    </html>
  );
}
