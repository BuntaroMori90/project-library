"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    await authClient.requestPasswordReset({ email: email.trim().toLowerCase(), redirectTo: `${window.location.origin}/account/update-password` });
    setMessage("Se l'indirizzo è registrato, riceverai le istruzioni per cambiare password."); setBusy(false);
  }
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">Recupero account</p><h1>Password dimenticata?</h1><p className="subtitle">Inserisci l'email associata all'account.</p><form className="form-stack" onSubmit={submit}><div className="field"><label>Email</label><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required /></div><button className="primary-btn" disabled={busy}>{busy?"Invio…":"Invia link"}</button>{message?<p className="form-message form-success">{message}</p>:null}<Link href="/login" className="subtitle" style={{fontSize:".8rem"}}>Torna al login</Link></form></section></main>;
}
