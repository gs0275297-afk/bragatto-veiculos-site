import type { Metadata } from "next";
import { site } from "@/config/site";
import { FinalCta } from "@/components/home/FinalCta";
import { Hero } from "@/components/home/Hero";
import { Intro } from "@/components/home/Intro";
import { Process } from "@/components/home/Process";
import { StockShowcase } from "@/components/home/StockShowcase";
import { Store } from "@/components/home/Store";
import { TradeIn } from "@/components/home/TradeIn";
import { dealerJsonLd, jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: `${site.name} — Carros usados e seminovos em Três Lagoas/MS` },
  description: `Estoque de veículos da ${site.name} em Três Lagoas – MS. Compra, venda e troca de carros, com atendimento pelo WhatsApp ${site.whatsapp.display} na Av. Filinto Müller, 1714 – Centro.`,
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(dealerJsonLd())} />
      <Intro />
      <Hero />
      <StockShowcase />
      <Process />
      <TradeIn />
      <Store />
      <FinalCta />
    </>
  );
}
