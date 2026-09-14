"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function google() {
    setBusy(true); setMessage(null);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/onboarding" });
    if (error) { setMessage("Non è stato possibile avviare l'accesso con Google."); setBusy(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (mode === "login") {
      const { error } = await authClient.signIn.email({ email: normalizedEmail, password, callbackURL: "/library" });
      if (error) { setMessage("Email o password non corretti."); setBusy(false); return; }
      router.replace("/library"); router.refresh(); return;
    }
    if (password.length < 8) { setMessage("La password deve contenere almeno 8 caratteri."); setBusy(false); return; }
    const { error } = await authClient.signUp.email({ email: normalizedEmail, password, name: displayName.trim() || normalizedEmail.split("@")[0], callbackURL: "/onboarding" });
    if (error) { setMessage("Non è stato possibile creare l'account. Controlla i dati o prova ad accedere."); setBusy(false); return; }
    router.replace("/onboarding"); router.refresh();
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <button type="button" className="secondary-btn" onClick={() => void google()} disabled={busy}>Continua con Google</button>
      <div className="divider">oppure</div>
      {mode === "register" ? <div className="field"><label>Nome visualizzato</label><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" required /></div> : null}
      <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></div>
      <div className="field"><label>Password</label><input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></div>
      <button className="primary-btn" disabled={busy}>{busy ? "Attendi…" : mode === "login" ? "Accedi" : "Crea account"}</button>
      {message ? <p className="form-message">{message}</p> : null}
      <p className="subtitle" style={{fontSize: ".78rem", margin: 0}}>{mode === "login" ? <><Link href="/forgot-password">Password dimenticata?</Link><br />Non hai un account? <Link href="/register">Crealo</Link>.</> : <>Hai già un account? <Link href="/login">Accedi</Link>.</>}</p>
    </form>
  );
}
