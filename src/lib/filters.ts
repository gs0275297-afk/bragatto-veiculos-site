import { FUELS, TRANSMISSIONS, type Fuel, type Transmission } from "@/lib/db/schema";

export const SORTS = {
  recentes: "Mais recentes",
  "preco-asc": "Menor preço",
  "preco-desc": "Maior preço",
  "ano-desc": "Ano mais novo",
  "ano-asc": "Ano mais antigo",
  "km-asc": "Menor quilometragem",
} as const;
export type SortKey = keyof typeof SORTS;

export const PAGE_SIZE = 12;
export const KM_PRESETS = [30000, 60000, 100000, 150000, 200000];

export type ListingFilters = {
  q?: string;
  marca?: string;
  precoMin?: number;
  precoMax?: number;
  anoMin?: number;
  anoMax?: number;
  kmMax?: number;
  cambio: Transmission[];
  combustivel: Fuel[];
  ordem: SortKey;
  pagina: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).flatMap((s) => s.split(",")).filter(Boolean);

function posInt(v: string | string[] | undefined, max = 1e10): number | undefined {
  const s = first(v)?.replace(/\D/g, "");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n <= max ? n : undefined;
}

export function normalizeSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseFilters(params: RawParams): ListingFilters {
  const ordem = first(params.ordem);
  const q = first(params.q)?.trim().slice(0, 80);
  return {
    q: q || undefined,
    marca: first(params.marca)?.trim().slice(0, 40) || undefined,
    precoMin: posInt(params.precoMin),
    precoMax: posInt(params.precoMax),
    anoMin: posInt(params.anoMin, 2100),
    anoMax: posInt(params.anoMax, 2100),
    kmMax: posInt(params.kmMax),
    cambio: all(params.cambio).filter((c): c is Transmission => (TRANSMISSIONS as readonly string[]).includes(c)),
    combustivel: all(params.combustivel).filter((c): c is Fuel => (FUELS as readonly string[]).includes(c)),
    ordem: ordem && ordem in SORTS ? (ordem as SortKey) : "recentes",
    pagina: posInt(params.pagina, 10000) ?? 1,
  };
}

/** Serializa os filtros em query string (omitindo valores padrão). */
export function filtersToQuery(f: Partial<ListingFilters>): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.marca) p.set("marca", f.marca);
  if (f.precoMin) p.set("precoMin", String(f.precoMin));
  if (f.precoMax) p.set("precoMax", String(f.precoMax));
  if (f.anoMin) p.set("anoMin", String(f.anoMin));
  if (f.anoMax) p.set("anoMax", String(f.anoMax));
  if (f.kmMax) p.set("kmMax", String(f.kmMax));
  if (f.cambio?.length) p.set("cambio", f.cambio.join(","));
  if (f.combustivel?.length) p.set("combustivel", f.combustivel.join(","));
  if (f.ordem && f.ordem !== "recentes") p.set("ordem", f.ordem);
  if (f.pagina && f.pagina > 1) p.set("pagina", String(f.pagina));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function activeFilterCount(f: ListingFilters): number {
  return (
    (f.q ? 1 : 0) +
    (f.marca ? 1 : 0) +
    (f.precoMin || f.precoMax ? 1 : 0) +
    (f.anoMin || f.anoMax ? 1 : 0) +
    (f.kmMax ? 1 : 0) +
    f.cambio.length +
    f.combustivel.length
  );
}
