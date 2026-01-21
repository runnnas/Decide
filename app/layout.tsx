import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";      
import { SpeedInsights } from "@vercel/speed-insights/next";    
import "./globals.css";

//  Geist Font Setup
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Decide. | Simple Decision Maker",
  description: "Reduce decision fatigue instantly.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#5a595f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#5a595f] text-white selection:bg-blue-500`}
      >
        <div className="min-h-screen flex flex-col items-center overflow-x-hidden bg-[#5a595f]">
          {children}
        </div>

        {/* Vercel Performance Tools */}
        <Analytics />       
        <SpeedInsights />   
      </body>
    </html>
  );
}