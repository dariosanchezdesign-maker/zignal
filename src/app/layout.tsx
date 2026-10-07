import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zignal — AI Visibility Intelligence",
  description:
    "See how AI recommends your business — and learn how to become the business it recommends.",
};

export const viewport: Viewport = {
  themeColor: "#F7F7F5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
