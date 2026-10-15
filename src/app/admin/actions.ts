"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { DUMMY_HASH, hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "@/lib/auth/password";
import { canAttempt, clearFailures, registerFailure } from "@/lib/auth/rate-limit";
import { createSession, destroySession, requireOwner, requireUser, revokeUserSessions } from "@/lib/auth/session";
import { VEHICLES_TAG } from "@/lib/data/vehicles";
import { validateGlb, validateModelUrl } from "@/lib/model3d";
import { blobPublicBase, storage } from "@/lib/storage";
import { model3dMetaSchema, photoUpdateSchema, vehicleInputSchema } from "@/lib/vehicle-input";
import { createVehicle, deletePhoto, deleteVehicle, reorderPhotos, updateVehicle } from "@/lib/vehicle-service";

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string> };

const fieldErrors = (error: z.ZodError) => {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
};

// ---------------------------------------------------------------- autenticação

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const ip = ((await headers()).get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const keys = [`email:${email}`, `ip:${ip}`];

  for (const key of keys) {
    if (!(await canAttempt(key))) return { message: "Muitas tentativas. Aguarde 15 minutos e tente novamente." };
  }

  const [user] = email ? await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1) : [];
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    for (const key of keys) await registerFailure(key);
    return { message: "E-mail ou senha incorretos." };
  }
  for (const key of keys) await clearFailures(key);
  await db.update(schema.users).set({ lastLoginAt: Date.now() }).where(eq(schema.users.id, user.id));
  await createSession(user.id);
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

// ---------------------------------------------------------------- veículos

export async function saveVehicleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const id = String(formData.get("id") ?? "") || null;
  const raw = Object.fromEntries(formData.entries());
  const parsed = vehicleInputSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revise os campos destacados." };

  let targetId = id;
  if (id) {
    await updateVehicle(id, parsed.data);
  } else {
    targetId = (await createVehicle(parsed.data)).id;
  }
  updateTag(VEHICLES_TAG);
  if (!id) redirect(`/admin/veiculos/${targetId}?criado=1`);
  return { ok: true, message: "Alterações salvas." };
}

export async function quickUpdateAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));
  const field = String(formData.get("field"));
  const value = String(formData.get("value"));
  const nowMs = Date.now();
  if (field === "published") {
    const [cur] = await db.select({ publishedAt: schema.vehicles.publishedAt }).from(schema.vehicles).where(eq(schema.vehicles.id, id));
    await db
      .update(schema.vehicles)
      .set({ published: value === "true", publishedAt: value === "true" ? (cur?.publishedAt ?? nowMs) : cur?.publishedAt, updatedAt: nowMs })
      .where(eq(schema.vehicles.id, id));
  } else if (field === "status" && ["disponivel", "reservado", "vendido"].includes(value)) {
    await db
      .update(schema.vehicles)
      .set({ status: value as "disponivel" | "reservado" | "vendido", updatedAt: nowMs })
      .where(eq(schema.vehicles.id, id));
  }
  updateTag(VEHICLES_TAG);
}

export async function deleteVehicleAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "EXCLUIR") {
    redirect(`/admin/veiculos/${id}?erro=confirmacao`);
  }
  await deleteVehicle(id);
  updateTag(VEHICLES_TAG);
  redirect("/admin?excluido=1");
}

// ---------------------------------------------------------------- fotos

export async function updatePhotoAction(input: { id: string; alt: string; angle: string; kind: string; focalX: number; focalY: number }) {
  await requireUser();
  const parsed = photoUpdateSchema.parse(input);
  await db
    .update(schema.vehiclePhotos)
    .set({ alt: parsed.alt, angle: parsed.angle, kind: parsed.kind, focalX: parsed.focalX, focalY: parsed.focalY })
    .where(eq(schema.vehiclePhotos.id, parsed.id));
  updateTag(VEHICLES_TAG);
  return { ok: true };
}

export async function deletePhotoAction(photoId: string) {
  await requireUser();
  await deletePhoto(photoId);
  updateTag(VEHICLES_TAG);
  return { ok: true };
}

export async function reorderPhotosAction(vehicleId: string, orderedIds: string[]) {
  await requireUser();
  await reorderPhotos(vehicleId, orderedIds.slice(0, 500));
  updateTag(VEHICLES_TAG);
  return { ok: true };
}

// ---------------------------------------------------------------- modelo 3D

export async function saveModel3dMetaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const id = String(formData.get("id"));
  const parsed = model3dMetaSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revise os campos do 3D." };
  const [cur] = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, id));
  if (!cur) return { message: "Veículo não encontrado." };
  if (parsed.data.model3dEnabled && !cur.model3dKey && !cur.model3dUrl) {
    return { errors: { model3dEnabled: "Envie um arquivo ou informe uma URL antes de ativar." }, message: "Nenhum modelo associado." };
  }
  await db
    .update(schema.vehicles)
    .set({ ...parsed.data, updatedAt: Date.now() })
    .where(eq(schema.vehicles.id, id));
  updateTag(VEHICLES_TAG);
  return { ok: true, message: parsed.data.model3dEnabled ? "Visualizador 3D ativado." : "Configuração do 3D salva (visualizador desativado)." };
}

export async function setModel3dUrlAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const id = String(formData.get("id"));
  const result = await validateModelUrl(String(formData.get("model3dUrl") ?? ""));
  if (!result.ok) return { errors: { model3dUrl: result.error }, message: result.error };
  const [cur] = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, id));
  if (!cur) return { message: "Veículo não encontrado." };
  if (cur.model3dKey) await storage().delete(cur.model3dKey).catch(() => undefined);
  await db
    .update(schema.vehicles)
    .set({ model3dUrl: result.url, model3dKey: null, model3dFormat: result.format, model3dSizeBytes: result.sizeBytes, updatedAt: Date.now() })
    .where(eq(schema.vehicles.id, id));
  updateTag(VEHICLES_TAG);
  return { ok: true, message: "URL validada e associada ao veículo." };
}

/**
 * Associa um GLB enviado diretamente ao Vercel Blob. O arquivo é baixado e validado aqui;
 * se for inválido, é apagado do Blob e nada muda no veículo.
 */
export async function attachBlobModelAction(vehicleId: string, url: string): Promise<FormState> {
  await requireUser();
  const base = blobPublicBase();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { message: "URL do upload inválida." };
  }
  const key = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!base || parsed.origin !== new URL(base).origin || !key.startsWith(`veiculos/${vehicleId}/3d/`) || !key.endsWith(".glb")) {
    return { message: "Arquivo fora do armazenamento autorizado." };
  }
  const discard = () => storage().delete(key).catch(() => undefined);

  const res = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!res?.ok) {
    await discard();
    return { message: "Não foi possível ler o arquivo enviado." };
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const check = validateGlb(buffer);
  if (!check.ok) {
    await discard();
    return { message: check.error };
  }
  const [cur] = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, vehicleId));
  if (!cur) {
    await discard();
    return { message: "Veículo não encontrado." };
  }
  if (cur.model3dKey && cur.model3dKey !== key) await storage().delete(cur.model3dKey).catch(() => undefined);
  await db
    .update(schema.vehicles)
    .set({ model3dKey: key, model3dUrl: null, model3dFormat: "glb", model3dSizeBytes: buffer.length, updatedAt: Date.now() })
    .where(eq(schema.vehicles.id, vehicleId));
  updateTag(VEHICLES_TAG);
  return { ok: true, message: "Modelo enviado e validado." };
}

export async function removeModel3dAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));
  const [cur] = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, id));
  if (!cur) return;
  await Promise.allSettled([cur.model3dKey, cur.model3dPosterKey].filter(Boolean).map((k) => storage().delete(k!)));
  await db
    .update(schema.vehicles)
    .set({
      model3dEnabled: false,
      model3dKey: null,
      model3dUrl: null,
      model3dFormat: null,
      model3dSizeBytes: null,
      model3dPosterKey: null,
      updatedAt: Date.now(),
    })
    .where(eq(schema.vehicles.id, id));
  updateTag(VEHICLES_TAG);
}

// ---------------------------------------------------------------- usuários

const newUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  role: z.enum(["owner", "editor"]),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`).max(200),
});

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const parsed = newUserSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revise os campos." };
  const exists = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, parsed.data.email));
  if (exists.length) return { errors: { email: "Já existe um usuário com este e-mail." } };
  await db.insert(schema.users).values({
    id: randomUUID(),
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    passwordHash: await hashPassword(parsed.data.password),
  });
  return { ok: true, message: "Usuário criado." };
}

export async function deleteUserAction(formData: FormData) {
  const me = await requireOwner();
  const id = String(formData.get("id"));
  if (id === me.id) return;
  const owners = await db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.role, "owner"), ne(schema.users.id, id)));
  if (!owners.length) return; // nunca remove o último administrador
  await db.delete(schema.users).where(eq(schema.users.id, id));
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, me.id));
  if (!user || !(await verifyPassword(current, user.passwordHash))) return { errors: { current: "Senha atual incorreta." } };
  if (next.length < MIN_PASSWORD_LENGTH) return { errors: { next: `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.` } };
  if (next !== confirm) return { errors: { confirm: "As senhas não conferem." } };
  await db.update(schema.users).set({ passwordHash: await hashPassword(next) }).where(eq(schema.users.id, me.id));
  await revokeUserSessions(me.id);
  await createSession(me.id);
  return { ok: true, message: "Senha alterada. Outras sessões foram encerradas." };
}
