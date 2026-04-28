import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/toaster";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Receipt — reputation you can show",
  description:
    "A marketplace where every profile shows public reputation from double-blind mutual ratings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} min-h-screen font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
