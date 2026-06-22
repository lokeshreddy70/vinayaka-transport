import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Vinayaka Operations Portal",
  description: "Counter booking, dispatch and storage"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
