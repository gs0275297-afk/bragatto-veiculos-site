import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordForm } from "@/components/admin/AccountForms";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Minha conta" };

export default function AccountPage() {
  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">Minha conta</h1>
          <p className="a-sub">Ao trocar a senha, as outras sessões abertas são encerradas.</p>
        </div>
      </div>
      <Suspense fallback={null}>
        <Gate />
      </Suspense>
    </>
  );
}

async function Gate() {
  await requireUser();
  return <PasswordForm />;
}
