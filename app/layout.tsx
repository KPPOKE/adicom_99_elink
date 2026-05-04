import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adicom99 Management System",
  description: "Sistem internal Adicom99 untuk inventory, transaksi, service, dan keuangan.",
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
