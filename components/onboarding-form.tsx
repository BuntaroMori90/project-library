"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveOnboarding } from "@/app/onboarding/actions";

const options = [["BOOK", "Libri"], ["MANGA", "Manga"], ["ANIME", "Anime"]] as const;

export function OnboardingForm({ suggestedName }: { suggestedName: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(suggestedName);
  const [username, setUsername] = useState("");
  const [selected, setSelected] = useState<string[]>(["BOOK", "MANGA", "ANIME"]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  function toggle(value: string) { setSelected((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]); }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (selected.length === 0) return setMessage("Scegli almeno una sezione.");
    setBusy(true); setMessage(null);
    const result = await saveOnboarding({ displayName, username, selected });
    if (!result.ok) { setMessage(result.message ?? "Non siamo riusciti a salvare il profilo."); setBusy(false); return; }
    router.replace("/library"); router.refresh();
  }
  return (
    <form className="form-stack" onSubmit={save}>
      <div className="field"><label>Nome visualizzato</label><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required /></div>
      <div className="field"><label>Username <span style={{color:"#777"}}>(facoltativo)</span></label><input minLength={3} maxLength={40} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="es. buntaromori" /></div>
      <div><p className="subtitle" style={{fontSize:".75rem"}}>Cosa vuoi tenere sotto controllo?</p><div className="onboarding-options">{options.map(([value,label]) => <button key={value} type="button" className={`choice ${selected.includes(value) ? "active" : ""}`} onClick={() => toggle(value)}>{label}</button>)}</div></div>
      <button className="primary-btn" disabled={busy}>{busy ? "Salvataggio…" : "Entra nella tua libreria"}</button>
      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}
