import type { Metadata } from "next";
import { Suspense } from "react";
import { NewUserForm } from "@/components/admin/AccountForms";
import { deleteUserAction } from "@/app/admin/actions";
import { requireOwner } from "@/lib/auth/session";
import { listUsers } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Usuários" };

export default function UsersPage() {
  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">Usuários</h1>
          <p className="a-sub">Quem pode acessar o painel. Somente administradores veem esta página.</p>
        </div>
      </div>
      <Suspense fallback={<p>Carregando…</p>}>
        <Users />
      </Suspense>
    </>
  );
}

async function Users() {
  const me = await requireOwner();
  const users = await listUsers();
  return (
    <>
      <div className="a-card a-table-wrap" style={{ padding: 0, marginBottom: 16 }}>
        <table className="a-table">
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">E-mail</th>
              <th scope="col">Perfil</th>
              <th scope="col">Último acesso</th>
              <th scope="col">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td className="mono">{u.email}</td>
                <td>
                  <span className="a-pill" data-tone={u.role === "owner" ? "red" : "off"}>
                    {u.role === "owner" ? "Administrador" : "Editor"}
                  </span>
                </td>
                <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("pt-BR") : "—"}</td>
                <td>
                  {u.id !== me.id && (
                    <form action={deleteUserAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <button type="submit" className="a-link-btn" data-danger>
                        Remover acesso
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <NewUserForm />
    </>
  );
}
