import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/admin/LoginForm";

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
        <LoginForm />
      </div>
    </main>
  );
}
