import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { site } from "@/config/site";
import { VehicleDetail } from "@/components/vehicles/detail/VehicleDetail";
import { getAllPublishedSlugs, getVehicleBySlug } from "@/lib/data/vehicles";
import { formatKm, formatPrice, formatYear, vehicleName } from "@/lib/format";
import { transmissionLabel } from "@/lib/vehicle-labels";
import styles from "./page.module.css";

const PLACEHOLDER = "__sem-veiculos__";

export async function generateStaticParams() {
  const rows = await getAllPublishedSlugs();
  // Cache Components exige ao menos um parâmetro; o marcador resulta em 404.
  return rows.length ? rows.map((r) => ({ slug: r.slug })) : [{ slug: PLACEHOLDER }];
}

export async function generateMetadata({ params }: PageProps<"/veiculos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const v = await getVehicleBySlug(slug);
  if (!v) return { title: "Veículo não encontrado", robots: { index: false } };

  const name = vehicleName(v);
  const year = formatYear(v.yearManufacture, v.yearModel);
  const facts = [
    year,
    formatKm(v.mileageKm),
    v.transmission ? transmissionLabel[v.transmission] : null,
    formatPrice(v.priceCents) ?? "preço sob consulta",
  ].filter(Boolean);
  const title = `${name} ${year}`;
  const description = `${name} ${facts.join(", ")}. À venda na ${site.name}, ${site.address.city} – ${site.address.state}. Fale pelo WhatsApp ${site.whatsapp.display}.`;
  const cover = v.photos[0];

  return {
    title,
    description,
    alternates: { canonical: `/veiculos/${v.slug}` },
    robots: v.isDemo ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      url: `/veiculos/${v.slug}`,
      title: `${title} | ${site.name}`,
      description,
      images: cover ? [{ url: cover.src, width: cover.width, height: cover.height, alt: cover.alt ?? title }] : undefined,
    },
  };
}

export default function VehiclePage({ params }: PageProps<"/veiculos/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <VehicleContent params={params} />
    </Suspense>
  );
}

async function VehicleContent({ params }: { params: PageProps<"/veiculos/[slug]">["params"] }) {
  const { slug } = await params;
  const vehicle = slug === PLACEHOLDER ? null : await getVehicleBySlug(slug);
  if (!vehicle) notFound();
  return <VehicleDetail vehicle={vehicle} />;
}

function DetailSkeleton() {
  return (
    <div className={`container ${styles.skeleton}`} aria-hidden="true">
      <div className={styles.skMedia} />
      <div className={styles.skPanel} />
    </div>
  );
}
