import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/ui/Icon";
import { logoutAction } from "@/app/admin/actions";
import { requireUser } from "@/lib/auth/session";

// O painel depende da sessão em toda requisição; não precisa de navegação "instantânea".
export const instant = false;

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="a-main">Carregando painel…</div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="a-shell">
      <aside className="a-side">
        <Link href="/admin" aria-label="Painel — início">
          <Image src="/brand/bragatto-assinatura.png" alt="Bragatto Veículos" width={134} height={30} />
        </Link>
        <nav aria-label="Painel">
          <Link href="/admin">
            <Icon name="grid" size={16} /> Veículos
          </Link>
          <Link href="/admin/veiculos/novo">
            <Icon name="plus" size={16} /> Novo veículo
          </Link>
          {user.role === "owner" && (
            <Link href="/admin/usuarios">
              <Icon name="key" size={16} /> Usuários
            </Link>
          )}
          <Link href="/admin/conta">
            <Icon name="eye" size={16} /> Minha conta
          </Link>
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Icon name="arrow" size={16} /> Ver site
          </a>
          <form action={logoutAction}>
            <button type="submit">
              <Icon name="logout" size={16} /> Sair
            </button>
          </form>
        </nav>
        <p className="a-user">
          <strong>{user.name}</strong>
          {user.email} · {user.role === "owner" ? "administrador" : "editor"}
        </p>
      </aside>
      <main className="a-main">{children}</main>
    </div>
  );
}
