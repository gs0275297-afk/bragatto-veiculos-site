"use client";

import { startTransition, useActionState } from "react";
import { changePasswordAction, createUserAction, type FormState } from "@/app/admin/actions";

function useManualSubmit(dispatch: (fd: FormData) => void) {
  return {
    onSubmit: (ev: React.FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      const data = new FormData(ev.currentTarget);
      startTransition(() => dispatch(data));
    },
  };
}

export function NewUserForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createUserAction, {});
  const form = useManualSubmit(action);
  const e = state.errors ?? {};
  return (
    <form {...form} className="a-card">
      <h2 className="a-card-title">Novo usuário</h2>
      {state.message && (
        <p className="a-notice" data-tone={state.ok ? "ok" : "error"}>
          {state.message}
        </p>
      )}
      <div className="a-grid">
        <label className="a-field a-col-6" data-error={e.name ? "" : undefined}>
          <span className="a-label">Nome</span>
          <input name="name" className="a-input" required />
          {e.name && <span className="a-error">{e.name}</span>}
        </label>
        <label className="a-field a-col-6" data-error={e.email ? "" : undefined}>
          <span className="a-label">E-mail</span>
          <input name="email" type="email" className="a-input" required autoComplete="off" />
          {e.email && <span className="a-error">{e.email}</span>}
        </label>
        <label className="a-field a-col-6">
          <span className="a-label">Perfil</span>
          <select name="role" className="a-select" defaultValue="editor">
            <option value="editor">Editor — gerencia veículos</option>
            <option value="owner">Administrador — gerencia veículos e usuários</option>
          </select>
        </label>
        <label className="a-field a-col-6" data-error={e.password ? "" : undefined}>
          <span className="a-label">Senha inicial</span>
          <input name="password" type="password" className="a-input" required autoComplete="new-password" minLength={10} />
          {e.password ? <span className="a-error">{e.password}</span> : <span className="a-help">Mínimo de 10 caracteres. Peça para a pessoa trocar no primeiro acesso.</span>}
        </label>
      </div>
      <div className="a-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? "Criando…" : "Criar usuário"}
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  const form = useManualSubmit(action);
  const e = state.errors ?? {};
  return (
    <form {...form} className="a-card" style={{ maxWidth: 560 }}>
      <h2 className="a-card-title">Alterar senha</h2>
      {state.message && (
        <p className="a-notice" data-tone={state.ok ? "ok" : "error"}>
          {state.message}
        </p>
      )}
      <div className="a-grid">
        {(
          [
            ["current", "Senha atual", "current-password"],
            ["next", "Nova senha", "new-password"],
            ["confirm", "Confirme a nova senha", "new-password"],
          ] as const
        ).map(([name, label, ac]) => (
          <label key={name} className="a-field a-col-12" data-error={e[name] ? "" : undefined}>
            <span className="a-label">{label}</span>
            <input name={name} type="password" className="a-input" required autoComplete={ac} />
            {e[name] && <span className="a-error">{e[name]}</span>}
          </label>
        ))}
      </div>
      <div className="a-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? "Salvando…" : "Alterar senha"}
        </button>
      </div>
    </form>
  );
}
