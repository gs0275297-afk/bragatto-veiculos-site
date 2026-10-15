/**
 * Dados institucionais da Bragatto Veículos.
 *
 * Apenas informações confirmadas pela loja devem ser preenchidas aqui.
 * Campos opcionais deixados como `undefined` simplesmente não aparecem no site
 * nem nos dados estruturados (SEO).
 */
export const site = {
  name: "Bragatto Veículos",
  shortName: "Bragatto",
  description:
    "Compra, venda e troca de veículos em Três Lagoas – MS. Consulte o estoque da Bragatto Veículos e fale com a loja pelo WhatsApp.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  locale: "pt_BR",

  whatsapp: {
    /** Somente dígitos, com DDI e DDD. */
    number: "5567991305081",
    display: "(67) 99130-5081",
  },
  phone: {
    e164: "+5567991305081",
    display: "(67) 99130-5081",
  },
  instagram: {
    handle: "bragattoveiculos",
    url: "https://www.instagram.com/bragattoveiculos/",
  },

  address: {
    street: "Avenida Filinto Müller, 1714",
    district: "Centro",
    city: "Três Lagoas",
    state: "MS",
    country: "BR",
    /** CEP ainda não informado pela loja. */
    postalCode: undefined as string | undefined,
  },

  /** Ainda não informados pela loja — preencher quando confirmados. */
  email: undefined as string | undefined,
  cnpj: undefined as string | undefined,
  /** Ex.: [{ days: "Segunda a sexta", hours: "08h às 18h" }] */
  openingHours: undefined as { days: string; hours: string }[] | undefined,
  /** Coordenadas exatas da loja (opcional, melhora o mapa e o SEO local). */
  geo: undefined as { lat: number; lng: number } | undefined,

  services: {
    compra: true,
    venda: true,
    troca: true,
    /** A loja atende interessados em financiamento; condições são informadas no atendimento. */
    financiamento: true,
  },
} as const;

export const fullAddress = `${site.address.street} – ${site.address.district}, ${site.address.city} – ${site.address.state}`;

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${site.name}, ${site.address.street}, ${site.address.district}, ${site.address.city} - ${site.address.state}`,
)}`;

export const mapsEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
  `${site.address.street}, ${site.address.district}, ${site.address.city} - ${site.address.state}`,
)}&output=embed`;
