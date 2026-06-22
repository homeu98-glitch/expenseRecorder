import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "開支記錄助手 - 智能收據管理",
  description: "輕鬆記錄您的各項開支，AI 自動識別收據。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen pb-20 md:pb-0 md:pt-16">
        <AuthGuard>
          <Navigation />
          <main className="container mx-auto px-4 py-6 max-w-4xl">
            {children}
          </main>
        </AuthGuard>
      </body>
    </html>
  );
}
