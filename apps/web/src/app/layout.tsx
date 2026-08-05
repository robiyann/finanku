import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Keuanganku v2 — Dashboard Analisis & Scanner Nota AI",
  description: "Aplikasi pencatat keuangan pintar & scanner nota pribadi ditenagai Financial AI Engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${outfit.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col selection:bg-blue-500/30 selection:text-blue-200">
        {children}
      </body>
    </html>
  );
}
