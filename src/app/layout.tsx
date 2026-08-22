import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from '@/components/auth-provider';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuickOrder - Restaurant Dashboard",
  description: "QR Code Ordering System for Restaurants",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
