import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Serif_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import SessionProvider from "@/components/SessionProvider";
import AppNavBar from "@/components/AppNavBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Cronogramas",
  description: "Genera cronogramas justos y rotacionales para tu banda",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSerif.variable} antialiased`}
      >
        <SessionProvider>
          <AppNavBar />
          {children}
          <Analytics />
        </SessionProvider>
      </body>
    </html>
  );
}
