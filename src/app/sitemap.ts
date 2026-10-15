import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { getAllPublishedSlugs } from "@/lib/data/vehicles";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vehicles = await getAllPublishedSlugs();
  return [
    { url: `${site.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/veiculos`, changeFrequency: "daily", priority: 0.9 },
    ...vehicles.map((v) => ({
      url: `${site.url}/veiculos/${v.slug}`,
      lastModified: new Date(v.updatedAt),
      changeFrequency: "weekly" as const,
      priority: v.status === "vendido" ? 0.3 : 0.8,
    })),
  ];
}
