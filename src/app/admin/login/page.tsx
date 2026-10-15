import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/admin/LoginForm";
import { isVitrine } from "@/lib/db/env";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="a-login">
      <div className="a-login-card">
        <Image src="/brand/bragatto-logo.png" alt="Bragatto Veículos" width={150} height={105} preload />
        <div>
          <h1 className="a-title" style={{ fontSize: "1.5rem" }}>
            Painel da loja
          </h1>
          <p className="a-sub">Acesso restrito à equipe da Bragatto Veículos.</p>
        </div>
        {isVitrine() ? (
          <div className="a-notice" data-tone="warn" role="status">
            <span>
              <strong>Painel desativado (modo vitrine).</strong> O site está publicado somente para leitura porque o projeto
              na Vercel ainda não tem banco de dados nem armazenamento conectados. Em <em>Storage</em>, conecte{" "}
              <strong>Turso</strong> e <strong>Blob</strong>, defina <code>ADMIN_EMAIL</code> e <code>ADMIN_PASSWORD</code>{" "}
              e faça um Redeploy.
            </span>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </main>
  );
}
