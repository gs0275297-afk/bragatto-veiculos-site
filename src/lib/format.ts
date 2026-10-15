const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const int = new Intl.NumberFormat("pt-BR");

export function formatPrice(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  return brl.format(Math.round(cents / 100));
}

export function formatKm(km: number | null | undefined): string | null {
  if (km == null) return null;
  return `${int.format(km)} km`;
}

export function formatNumber(n: number): string {
  return int.format(n);
}

export function formatYear(fab: number | null | undefined, model: number): string {
  return fab ? `${fab}/${model}` : String(model);
}

type Named = { brand: string; model: string; version?: string | null };

export function vehicleName(v: Named, opts: { version?: boolean } = { version: true }): string {
  return [v.brand, v.model, opts.version ? v.version : null].filter(Boolean).join(" ");
}

export function vehicleTitle(v: Named & { yearManufacture?: number | null; yearModel: number }): string {
  return `${vehicleName(v)} ${formatYear(v.yearManufacture, v.yearModel)}`;
}
