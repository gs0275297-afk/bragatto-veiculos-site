"use client";

import { startTransition, useActionState } from "react";
import { loginAction, type FormState } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form
      className="a-grid"
      style={{ gap: 14 }}
      onSubmit={(ev) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {state.message && (
        <p className="a-notice a-col-12" data-tone="error" role="alert">
          {state.message}
        </p>
      )}
      <label className="a-field a-col-12">
        <span className="a-label">E-mail</span>
        <input className="a-input" type="email" name="email" autoComplete="username" required autoFocus />
      </label>
      <label className="a-field a-col-12">
        <span className="a-label">Senha</span>
        <input className="a-input" type="password" name="password" autoComplete="current-password" required />
      </label>
      <button type="submit" className="btn btn-primary btn-block a-col-12" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
