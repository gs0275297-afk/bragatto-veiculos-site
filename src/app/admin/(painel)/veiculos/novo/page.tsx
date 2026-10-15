import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Novo veículo" };

export default function NewVehiclePage() {
  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">Novo veículo</h1>
          <p className="a-sub">Preencha os dados. Depois de criar, você poderá enviar as fotos e o modelo 3D.</p>
        </div>
        <Link href="/admin" className="a-link-btn">
          Voltar
        </Link>
      </div>
      <Suspense fallback={null}>
        <Gate />
      </Suspense>
    </>
  );
}

async function Gate() {
  await requireUser();
  return <VehicleForm />;
}
