import type { Metadata } from "next";
import "./globals.css";
import "./saas.css";
import "./friendly.css";
import "./pede360.css";
import "./menu-customization.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "PEDE360 — Gestão de Pedidos",
  applicationName: "PEDE360",
  description:
    "PEDE360: sua operação completa para cardápio digital, pedidos, PDV e delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
