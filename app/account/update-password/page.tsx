"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";

function UpdatePasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const token = params.get("token");
    if (!token) {
      setMessage("Il link di recupero non è valido o è scaduto.");
      return;
    }

    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) {
      setMessage("Non è stato possibile aggiornare la password.");
      setBusy(false);
      return;
    }

    router.replace("/library");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Sicurezza</p>
        <h1>Nuova password</h1>
        <form className="form-stack" onSubmit={submit}>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <button className="primary-btn" disabled={busy}>
            {busy ? "Salvataggio…" : "Aggiorna password"}
          </button>
          {message ? <p className="form-message">{message}</p> : null}
        </form>
      </section>
    </main>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page">
          <section className="auth-card">
            <p className="eyebrow">Sicurezza</p>
            <h1>Caricamento…</h1>
          </section>
        </main>
      }
    >
      <UpdatePasswordForm />
    </Suspense>
  );
}
