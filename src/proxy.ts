import { NextResponse, type NextRequest } from "next/server";

/**
 * Verificação otimista: sem cookie de sessão, o painel redireciona para o login.
 * A validação real (sessão no banco, expiração, perfil) acontece em cada página,
 * ação e rota administrativa via requireUser()/guardAdminRequest().
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin/login")) return NextResponse.next();
  if (!req.cookies.has("bv_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
