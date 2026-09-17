"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseVolumeSelection } from "@/lib/inventory/volume-selection";

export function BulkOwnedVolumes({ workId, editions }: { workId: string; editions: { id: string; name: string }[] }) {
  const router = useRouter();
  const lock = useRef(false);
  const [editionId, setEditionId] = useState(editions[0]?.id ?? "");
  const [selection, setSelection] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  let numbers: number[] = []; let invalid = "";
  if (selection.trim()) { try { numbers = parseVolumeSelection(selection); } catch (e) { invalid = (e as Error).message; } }
  if (!editions.length) return null;
  return <details className="manual-work-entry"><summary>Aggiungi più volumi posseduti</summary>
    <form className="manual-work-form" aria-busy={pending} onSubmit={async (event) => {
      event.preventDefault(); if (lock.current || !numbers.length || invalid) return;
      lock.current = true; setPending(true); setError(""); setMessage("");
      try {
        const response = await fetch("/api/manga/owned-volumes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workId, editionId, selection }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Salvataggio non riuscito.");
        setMessage(`${result.added} volumi aggiunti; ${result.alreadyOwned} già presenti e lasciati invariati.`);
        setSelection(""); router.refresh();
      } catch (e) { setError(e instanceof Error ? e.message : "Salvataggio non confermato. Puoi riprovare: i volumi già presenti non vengono duplicati."); }
      finally { lock.current = false; setPending(false); }
    }}>
      <label>Edizione<select value={editionId} disabled={pending} onChange={(e) => { setEditionId(e.target.value); setMessage(""); }}>
        {editions.map((edition) => <option key={edition.id} value={edition.id}>{edition.name}</option>)}
      </select></label>
      <label>Volumi cartacei posseduti<input value={selection} disabled={pending} placeholder="1–12, 15, 18" onChange={(e) => { setSelection(e.target.value); setMessage(""); setError(""); }} aria-describedby="bulk-volume-help" /></label>
      <p id="bulk-volume-help">Puoi inserire numeri o intervalli. I volumi già registrati vengono saltati. Per volumi speciali usa la scheda dell’edizione.</p>
      {numbers.length ? <p role="status">Selezionati {numbers.length} volumi: {numbers.length <= 30 ? numbers.join(", ") : `${numbers.slice(0, 15).join(", ")}… fino al ${numbers[numbers.length - 1]}`}. Nessun dato di lettura verrà modificato.</p> : null}
      {invalid || error ? <p role="alert" className="catalog-error">{error || invalid}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <button className="primary-btn" type="submit" disabled={pending || !numbers.length || Boolean(invalid)}>{pending ? "Salvo…" : "Conferma volumi posseduti"}</button>
    </form>
  </details>;
}
