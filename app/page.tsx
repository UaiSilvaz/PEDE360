import type { Metadata } from "next";
import LandingPage from "@/components/landing-page";
import "./apresentacao/landing.css";
export const metadata: Metadata = {
  title: "PEDE360 — Seu restaurante inteiro. Uma gestão completa.",
  description:
    "Cardápio digital, pedidos, PDV e delivery conectados. Conheça o PEDE360 e simplifique a operação do seu restaurante.",
};
export default function Page() {
  return <LandingPage />;
}
