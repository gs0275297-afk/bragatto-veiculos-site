export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function vehicleSlugBase(v: {
  brand: string;
  model: string;
  version?: string | null;
  yearManufacture?: number | null;
  yearModel: number;
}): string {
  const year = v.yearManufacture && v.yearManufacture !== v.yearModel ? `${v.yearManufacture}-${v.yearModel}` : String(v.yearModel);
  return slugify([v.brand, v.model, v.version, year].filter(Boolean).join(" "));
}
