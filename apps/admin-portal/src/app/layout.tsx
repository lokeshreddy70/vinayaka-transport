import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata = {
  title: "Vinayaka Transport Admin",
  description: "Admin portal"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-[#F8FAFC] text-[#111827]`}>{children}</body>
    </html>
  );
}
