import { site } from "@/config/site";
import { formatYear, vehicleName } from "@/lib/format";

export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${site.whatsapp.number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

type VehicleRef = {
  brand: string;
  model: string;
  version?: string | null;
  yearManufacture?: number | null;
  yearModel: number;
  slug?: string;
};

function describe(v: VehicleRef) {
  return `${vehicleName(v)} ${formatYear(v.yearManufacture, v.yearModel)}`;
}

function link(v: VehicleRef) {
  return v.slug ? `\n${site.url}/veiculos/${v.slug}` : "";
}

export const messages = {
  general: () => `Olá! Vim pelo site da ${site.name} e gostaria de mais informações.`,
  vehicle: (v: VehicleRef) =>
    `Olá! Tenho interesse no ${describe(v)} anunciado no site da ${site.name}. Poderiam me passar mais informações?${link(v)}`,
  tradeIn: (v?: VehicleRef) =>
    v
      ? `Olá! Tenho interesse no ${describe(v)} e gostaria de avaliar meu veículo na troca.${link(v)}`
      : `Olá! Gostaria de avaliar meu veículo para troca na ${site.name}.`,
  financing: (v?: VehicleRef) =>
    v
      ? `Olá! Gostaria de consultar as condições de financiamento para o ${describe(v)}.${link(v)}`
      : `Olá! Gostaria de consultar as condições de financiamento na ${site.name}.`,
  search: (q: string) =>
    `Olá! Procurei no site da ${site.name} e não encontrei o que procuro${q ? ` (${q})` : ""}. Vocês têm algo parecido ou podem me avisar quando chegar?`,
};
