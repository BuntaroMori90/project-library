import type { Metadata, Viewport } from "next";
import { DetailAppMode } from "@/components/detail-app-mode";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Library",
  description: "La tua libreria personale di libri, manga e anime.",
  manifest: "/manifest.webmanifest",
  applicationName: "Library",
  appleWebApp: {
    capable: true,
    title: "Library",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/library-stories-v2-32.png",
    apple: "/library-stories-v2-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0438",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <PwaRegister />
        {children}
        <DetailAppMode />
      </body>
    </html>
  );
}
