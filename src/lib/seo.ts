import { site } from "@/config/site";
import type { PublicVehicle } from "@/lib/data/vehicles";
import { vehicleName } from "@/lib/format";
import { schemaTransmission } from "@/lib/vehicle-labels";

/** Dados estruturados da loja — apenas informações confirmadas (sem avaliações, sem notas). */
export function dealerJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    "@id": `${site.url}/#loja`,
    name: site.name,
    url: site.url,
    logo: `${site.url}/brand/bragatto-logo.png`,
    image: `${site.url}/brand/showroom-mezanino.jpg`,
    telephone: site.phone.e164,
    ...(site.email ? { email: site.email } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.state,
      addressCountry: site.address.country,
      ...(site.address.postalCode ? { postalCode: site.address.postalCode } : {}),
    },
    ...(site.geo ? { geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng } } : {}),
    areaServed: { "@type": "City", name: `${site.address.city} – ${site.address.state}` },
    sameAs: [site.instagram.url],
  };
}

const availability = {
  disponivel: "https://schema.org/InStock",
  reservado: "https://schema.org/LimitedAvailability",
  vendido: "https://schema.org/SoldOut",
} as const;

export function vehicleJsonLd(v: PublicVehicle) {
  const url = `${site.url}/veiculos/${v.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Car",
    name: vehicleName(v),
    url,
    brand: { "@type": "Brand", name: v.brand },
    model: v.model,
    ...(v.version ? { vehicleConfiguration: v.version } : {}),
    vehicleModelDate: String(v.yearModel),
    ...(v.yearManufacture ? { productionDate: String(v.yearManufacture) } : {}),
    ...(v.mileageKm != null
      ? { mileageFromOdometer: { "@type": "QuantitativeValue", value: v.mileageKm, unitCode: "KMT" } }
      : {}),
    ...(v.transmission ? { vehicleTransmission: schemaTransmission[v.transmission] } : {}),
    ...(v.fuel ? { fuelType: v.fuel } : {}),
    ...(v.color ? { color: v.color } : {}),
    ...(v.bodyType ? { bodyType: v.bodyType } : {}),
    ...(v.doors ? { numberOfDoors: v.doors } : {}),
    itemCondition: "https://schema.org/UsedCondition",
    image: v.photos.slice(0, 6).map((p) => (p.src.startsWith("http") ? p.src : `${site.url}${p.src}`)),
    ...(v.description ? { description: v.description } : {}),
    offers: {
      "@type": "Offer",
      url,
      availability: availability[v.status],
      ...(v.priceCents != null ? { price: (v.priceCents / 100).toFixed(2), priceCurrency: "BRL" } : {}),
      seller: { "@id": `${site.url}/#loja` },
    },
  };
}

/** Serializa JSON-LD com segurança para <script> (evita fechamento prematuro da tag). */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
