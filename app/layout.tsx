import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://myksh-app.vercel.app"),
  title: "MYKSH — Tus finanzas bajo control",
  description: "Organiza tus cuentas, movimientos, metas e inversiones.",
  icons: {
    icon: "/brand/myksh-icon.png",
    shortcut: "/brand/myksh-icon.png",
    apple: "/brand/myksh-icon.png",
  },
  openGraph: {
    type: "website",
    url: "/login",
    siteName: "MYKSH",
    title: "MYKSH — Tus finanzas bajo control",
    description: "Organiza tus cuentas, movimientos, metas e inversiones.",
    images: [{ url: "/brand/myksh-og.jpg", width: 1200, height: 630, alt: "MYKSH — Tus finanzas bajo control" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MYKSH — Tus finanzas bajo control",
    description: "Organiza tus cuentas, movimientos, metas e inversiones.",
    images: ["/brand/myksh-og.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}><body className="min-h-full flex flex-col">{children}</body></html>;
}
