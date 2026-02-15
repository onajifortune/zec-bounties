import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { BountyProvider } from "@/lib/bounty-context";
import { ZAddressProvider } from "@/components/address/zaddress-integration-hook";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "ZEC Bounties | Bounty Platform",
  description: "A privacy-first bounty platform powered by Zcash.",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Suspense fallback={<div>Loading...</div>}>
            <BountyProvider>
              <ZAddressProvider>{children}</ZAddressProvider>
            </BountyProvider>
          </Suspense>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
