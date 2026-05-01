import type { Metadata } from "next";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import { Toaster } from "@/components/ui/Toaster";
import { ptRootUI } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "ITResto - QR Menu",
  description: "QR Code Menu for restaurants, bars and cafes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning className={ptRootUI.variable}>
      <body suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
