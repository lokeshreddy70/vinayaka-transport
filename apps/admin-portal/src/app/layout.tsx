import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Vinayaka Transport Admin",
  description: "Admin portal"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
