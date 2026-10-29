import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Us — Our Story & Couple Space",
  description: "Private digital couple app for memories, wishlist, expenses, and milestones.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Us",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#b80035",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-[#fff8f5] text-[#1e1b19]">
        <div className="w-full max-w-md mx-auto min-h-dvh flex flex-col relative bg-[#fff8f5]">
          {children}
          <PwaInstallBanner />
        </div>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
