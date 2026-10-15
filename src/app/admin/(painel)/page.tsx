import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/ui/Icon";
import { quickUpdateAction } from "@/app/admin/actions";
import { requireUser } from "@/lib/auth/session";
import { listAdminVehicles } from "@/lib/data/admin";
import { formatPrice, formatYear } from "@/lib/format";
import { statusLabel } from "@/lib/vehicle-labels";

export const metadata: Metadata = { title: "Veículos" };

export default function AdminHome({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<p>Carregando…</p>}>
      <VehicleTable searchParams={searchParams} />
    </Suspense>
  );
}

async function VehicleTable({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireUser();
  const sp = await searchParams;
  const all = await listAdminVehicles();
  const filter = typeof sp.filtro === "string" ? sp.filtro : "todos";
  const rows = all.filter((r) =>
    filter === "publicados" ? r.published : filter === "rascunhos" ? !r.published : filter === "vendidos" ? r.status === "vendido" : true,
  );
  const counts = {
    todos: all.length,
    publicados: all.filter((r) => r.published).length,
    rascunhos: all.filter((r) => !r.published).length,
    vendidos: all.filter((r) => r.status === "vendido").length,
  };

  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">Veículos</h1>
          <p className="a-sub">Cadastre, publique e atualize o estoque exibido no site.</p>
        </div>
        <Link href="/admin/veiculos/novo" className="btn btn-primary">
          <Icon name="plus" size={18} /> Novo veículo
        </Link>
      </div>

      {sp.excluido && (
        <p className="a-notice" data-tone="ok" role="status">
          Veículo excluído.
        </p>
      )}

      <div className="a-actions" style={{ marginTop: 0, marginBottom: 16 }}>
        {(Object.keys(counts) as (keyof typeof counts)[]).map((k) => (
          <Link key={k} href={k === "todos" ? "/admin" : `/admin?filtro=${k}`} className="a-link-btn" aria-current={filter === k ? "page" : undefined} style={filter === k ? { borderColor: "var(--red)", color: "var(--text)" } : undefined}>
            {k[0].toUpperCase() + k.slice(1)} <span className="mono">{counts[k]}</span>
          </Link>
        ))}
      </div>

      <div className="a-card a-table-wrap" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <p style={{ padding: 24 }} className="a-sub">
            Nenhum veículo nesta lista.
          </p>
        ) : (
          <table className="a-table">
            <thead>
              <tr>
                <th scope="col">Foto</th>
                <th scope="col">Veículo</th>
                <th scope="col">Preço</th>
                <th scope="col">Site</th>
                <th scope="col">Status</th>
                <th scope="col">Recursos</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="a-thumb">
                      {r.coverSrc && <Image src={r.coverSrc} alt="" fill sizes="84px" style={{ objectFit: "cover" }} />}
                    </div>
                  </td>
                  <td>
                    <Link href={`/admin/veiculos/${r.id}`} className="a-vname">
                      {r.brand} {r.model}
                      <small>
                        {[r.version, formatYear(r.yearManufacture, r.yearModel)].filter(Boolean).join(" · ")}
                      </small>
                    </Link>
                  </td>
                  <td className="mono">{formatPrice(r.priceCents) ?? "Sob consulta"}</td>
                  <td>
                    <form action={quickUpdateAction} className="a-inline-form">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="field" value="published" />
                      <input type="hidden" name="value" value={r.published ? "false" : "true"} />
                      <span className="a-pill" data-tone={r.published ? "ok" : "off"}>
                        {r.published ? "Publicado" : "Rascunho"}
                      </span>
                      <button type="submit" className="a-link-btn">
                        {r.published ? "Despublicar" : "Publicar"}
                      </button>
                    </form>
                  </td>
                  <td>
                    <form action={quickUpdateAction} className="a-inline-form">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="field" value="status" />
                      <select name="value" defaultValue={r.status} className="a-mini-select" aria-label={`Status de ${r.brand} ${r.model}`}>
                        {Object.entries(statusLabel).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="a-link-btn">
                        Salvar
                      </button>
                    </form>
                  </td>
                  <td>
                    <div className="a-inline-form" style={{ flexWrap: "wrap" }}>
                      <span className="a-pill" data-tone="off">
                        {r.photoCount} fotos
                      </span>
                      {r.hasModel && (
                        <span className="a-pill" data-tone={r.model3dEnabled ? "ok" : "warn"}>
                          3D {r.model3dEnabled ? "ativo" : "inativo"}
                        </span>
                      )}
                      {r.featured && (
                        <span className="a-pill" data-tone="red">
                          Destaque
                        </span>
                      )}
                      {r.isDemo && (
                        <span className="a-pill" data-tone="info">
                          Demo
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="a-inline-form">
                      <Link href={`/admin/veiculos/${r.id}`} className="a-link-btn">
                        Editar
                      </Link>
                      {r.published && (
                        <a href={`/veiculos/${r.slug}`} target="_blank" rel="noopener noreferrer" className="a-link-btn" aria-label={`Ver ${r.brand} ${r.model} no site`}>
                          <Icon name="eye" size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
