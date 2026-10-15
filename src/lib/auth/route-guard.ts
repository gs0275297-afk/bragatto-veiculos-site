import "server-only";
import { getCurrentUser, type SessionUser } from "./session";

/**
 * Proteção para Route Handlers administrativos (uploads):
 * exige sessão válida e requisição originada do próprio site (defesa contra CSRF).
 */
export async function guardAdminRequest(req: Request): Promise<{ user: SessionUser } | { response: Response }> {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return { response: Response.json({ error: "Origem não permitida." }, { status: 403 }) };
  }
  const user = await getCurrentUser();
  if (!user) return { response: Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 }) };
  return { user };
}
