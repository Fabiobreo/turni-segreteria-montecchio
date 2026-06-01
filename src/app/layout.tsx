import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestione Turni — Segreteria",
  description: "Turni mensili della segreteria",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      {/* suppressHydrationWarning: alcune estensioni del browser (es. Grammarly) iniettano
          attributi nel <body> dopo il render del server, generando un falso warning di idratazione. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
