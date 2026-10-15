"use client";

import { startTransition, useActionState } from "react";
import { saveVehicleAction, type FormState } from "@/app/admin/actions";
import type { Vehicle } from "@/lib/db/schema";
import { FUELS, STATUSES, TRANSMISSIONS } from "@/lib/db/schema";
import { BODY_TYPES } from "@/lib/vehicle-input";
import { fuelLabel, statusLabel, transmissionLabel } from "@/lib/vehicle-labels";

type Props = { vehicle?: Vehicle };

function Field({
  name,
  label,
  error,
  required,
  help,
  className = "a-col-4",
  children,
}: {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  help?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`a-field ${className}`} data-error={error ? "" : undefined}>
      <label className="a-label" htmlFor={`f-${name}`}>
        {label} {required && <em aria-hidden="true">*</em>}
      </label>
      {children}
      {error ? (
        <span className="a-error" id={`f-${name}-err`}>
          {error}
        </span>
      ) : (
        help && <span className="a-help">{help}</span>
      )}
    </div>
  );
}

const priceToInput = (cents: number | null | undefined) =>
  cents == null ? "" : new Intl.NumberFormat("pt-BR").format(Math.round(cents / 100));

export function VehicleForm({ vehicle: v }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveVehicleAction, {});
  const e = state.errors ?? {};
  const aria = (n: string) => ({ id: `f-${n}`, name: n, "aria-invalid": e[n] ? true : undefined, "aria-describedby": e[n] ? `f-${n}-err` : undefined });

  return (
    <form
      className="a-card"
      noValidate
      onSubmit={(ev) => {
        // envio manual: evita que o React limpe os campos quando há erro de validação
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {v && <input type="hidden" name="id" value={v.id} />}
      {state.message && (
        <p className="a-notice" data-tone={state.ok ? "ok" : "error"} role={state.ok ? "status" : "alert"}>
          {state.message}
        </p>
      )}

      <h2 className="a-card-title">Identificação</h2>
      <div className="a-grid">
        <Field name="brand" label="Marca" required error={e.brand}>
          <input className="a-input" {...aria("brand")} defaultValue={v?.brand} placeholder="Ex.: Chevrolet" required />
        </Field>
        <Field name="model" label="Modelo" required error={e.model}>
          <input className="a-input" {...aria("model")} defaultValue={v?.model} placeholder="Ex.: Tracker" required />
        </Field>
        <Field name="version" label="Versão" error={e.version}>
          <input className="a-input" {...aria("version")} defaultValue={v?.version ?? ""} placeholder="Ex.: Premier 1.2 Turbo" />
        </Field>
        <Field name="yearManufacture" label="Ano de fabricação" error={e.yearManufacture} className="a-col-3">
          <input className="a-input" {...aria("yearManufacture")} inputMode="numeric" defaultValue={v?.yearManufacture ?? ""} placeholder="2023" />
        </Field>
        <Field name="yearModel" label="Ano do modelo" required error={e.yearModel} className="a-col-3">
          <input className="a-input" {...aria("yearModel")} inputMode="numeric" defaultValue={v?.yearModel ?? ""} placeholder="2024" required />
        </Field>
        <Field name="bodyType" label="Carroceria" error={e.bodyType} className="a-col-3">
          <select className="a-select" {...aria("bodyType")} defaultValue={v?.bodyType ?? ""}>
            <option value="">Não informar</option>
            {BODY_TYPES.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Field>
        <Field name="color" label="Cor" error={e.color} className="a-col-3">
          <input className="a-input" {...aria("color")} defaultValue={v?.color ?? ""} placeholder="Ex.: Preto" />
        </Field>
      </div>

      <h2 className="a-card-title" style={{ marginTop: 28 }}>
        Mecânica e uso
      </h2>
      <div className="a-grid">
        <Field name="mileageKm" label="Quilometragem (km)" error={e.mileageKm} className="a-col-3">
          <input className="a-input" {...aria("mileageKm")} inputMode="numeric" defaultValue={v?.mileageKm ?? ""} placeholder="64167" />
        </Field>
        <Field name="transmission" label="Câmbio" error={e.transmission} className="a-col-3">
          <select className="a-select" {...aria("transmission")} defaultValue={v?.transmission ?? ""}>
            <option value="">Não informar</option>
            {TRANSMISSIONS.map((t) => (
              <option key={t} value={t}>
                {transmissionLabel[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="fuel" label="Combustível" error={e.fuel} className="a-col-3">
          <select className="a-select" {...aria("fuel")} defaultValue={v?.fuel ?? ""}>
            <option value="">Não informar</option>
            {FUELS.map((f) => (
              <option key={f} value={f}>
                {fuelLabel[f]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="engine" label="Motor" error={e.engine} className="a-col-3">
          <input className="a-input" {...aria("engine")} defaultValue={v?.engine ?? ""} placeholder="Ex.: 1.0 Turbo" />
        </Field>
        <Field name="doors" label="Portas" error={e.doors} className="a-col-3">
          <input className="a-input" {...aria("doors")} inputMode="numeric" defaultValue={v?.doors ?? ""} />
        </Field>
      </div>

      <h2 className="a-card-title" style={{ marginTop: 28 }}>
        Anúncio
      </h2>
      <div className="a-grid">
        <Field name="price" label="Preço (R$)" error={e.price} help="Deixe vazio para exibir “Preço sob consulta”." className="a-col-4">
          <input className="a-input" {...aria("price")} inputMode="decimal" defaultValue={priceToInput(v?.priceCents)} placeholder="84.900" />
        </Field>
        <Field name="status" label="Disponibilidade" error={e.status} className="a-col-4">
          <select className="a-select" {...aria("status")} defaultValue={v?.status ?? "disponivel"}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="slug" label="Endereço da página" error={e.slug} help="Gerado automaticamente. Altere só se necessário." className="a-col-4">
          <input className="a-input" {...aria("slug")} defaultValue={v?.slug ?? ""} placeholder="marca-modelo-versao-ano" />
        </Field>
        <Field name="description" label="Descrição comercial" error={e.description} className="a-col-12" help="Somente informações verdadeiras e conferidas.">
          <textarea className="a-textarea" {...aria("description")} defaultValue={v?.description ?? ""} rows={5} />
        </Field>
        <Field name="features" label="Itens e opcionais (um por linha)" error={e.features} className="a-col-6">
          <textarea className="a-textarea" {...aria("features")} defaultValue={v?.features.join("\n") ?? ""} rows={8} placeholder={"Ar-condicionado\nDireção elétrica\nCâmera de ré"} />
        </Field>
        <Field name="internalNotes" label="Observações internas" error={e.internalNotes} className="a-col-6" help="Visível apenas no painel. Nunca aparece no site.">
          <textarea className="a-textarea" {...aria("internalNotes")} defaultValue={v?.internalNotes ?? ""} rows={8} />
        </Field>
        <label className="a-check a-col-6">
          <input type="checkbox" name="published" defaultChecked={v?.published ?? false} />
          <span>
            <strong>Publicar no site</strong>
            <span>Desmarcado = rascunho, visível só no painel.</span>
          </span>
        </label>
        <label className="a-check a-col-6">
          <input type="checkbox" name="featured" defaultChecked={v?.featured ?? false} />
          <span>
            <strong>Destaque na página inicial</strong>
            <span>Aparece no palco principal da home.</span>
          </span>
        </label>
      </div>

      <div className="a-actions a-sticky-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Salvando…" : v ? "Salvar alterações" : "Criar veículo e enviar fotos"}
        </button>
        {state.ok && !pending && <span className="a-help">Salvo.</span>}
      </div>
    </form>
  );
}
